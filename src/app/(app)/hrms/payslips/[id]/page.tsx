import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PayslipDownloadButton } from "@/components/hrms/payslip-download";
import { HRMS_TODAY, calculatePayrollLine, getEmployee } from "@/lib/hrms";
import { formatINR } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

const COMPANY = "Kreuger Manufacturing Pvt Ltd";

export default async function PayslipDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const month = typeof sp.month === "string" ? sp.month : HRMS_TODAY.slice(0, 7);
  const emp = getEmployee(id);
  if (!emp) notFound();

  const line = calculatePayrollLine(emp.id, month, "Paid");
  if (!line) notFound();

  return (
    <div>
      <PageHeader
        title={`Payslip — ${emp.name}`}
        description={`${emp.employeeId} · ${month} · ${emp.department}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <PayslipDownloadButton
              company={COMPANY}
              month={month}
              line={line}
              designation={emp.designation}
            />
            <Button variant="outline" nativeButton={false} render={<Link href="/hrms/payslips" />}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          </div>
        }
      />
      <PageBody className="space-y-4" narrow>
        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <div className="text-lg font-semibold">{COMPANY}</div>
              <div className="text-sm text-muted-foreground">Pay Period: {month}</div>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Employee Name</span>
                <div className="font-medium">{line.employeeName}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Employee ID</span>
                <div className="font-medium">{line.employeeCode}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Department</span>
                <div className="font-medium">{line.department}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Designation</span>
                <div className="font-medium">{emp.designation}</div>
              </div>
            </div>

            <Section title="Earnings">
              <Row label="Basic" value={formatINR(line.basic)} />
              <Row label="HRA" value={formatINR(line.hra)} />
              <Row label="Allowances" value={formatINR(line.allowances)} />
              <Row label="Overtime" value={formatINR(line.overtimePay)} />
              <Row label="Bonus" value={formatINR(line.bonus)} />
              <Row label="Gross Salary" value={formatINR(line.gross)} bold />
            </Section>

            <Section title="Deductions">
              <Row label="PF" value={formatINR(line.pf)} />
              <Row label="Professional Tax" value={formatINR(line.professionalTax)} />
              <Row label="TDS" value={formatINR(line.tds)} />
              <Row label="LOP" value={formatINR(line.lopDeduction)} />
              <Row label="Other Deductions" value={formatINR(line.otherDeductions)} />
              <Row label="Total Deductions" value={formatINR(line.totalDeductions)} bold />
            </Section>

            <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3">
              <span className="font-semibold">Net Salary</span>
              <span className="text-xl font-semibold tabular-nums">{formatINR(line.net)}</span>
            </div>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="rounded-lg border border-border">{children}</div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm ${bold ? "bg-secondary/60 font-semibold" : ""} border-b border-border last:border-0`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
