import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PayslipDownloadButton } from "@/components/hrms/payslip-download";
import { EMPLOYEES, HRMS_TODAY, calculatePayroll, getEmployee } from "@/lib/hrms";
import { formatINR } from "@/lib/format";

const COMPANY = "Kreuger Manufacturing Pvt Ltd";

export default function PayslipsPage() {
  const month = HRMS_TODAY.slice(0, 7);
  const run = calculatePayroll(month, "Paid");

  return (
    <div>
      <PageHeader
        title="Payslips"
        description={`Generated monthly payslips for ${month}. Open a row for the full breakdown.`}
      />
      <PageBody>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Pay Period</TableHead>
                  <TableHead>Gross</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.lines.map((line) => {
                  const emp = getEmployee(line.employeeId);
                  return (
                    <ClickableTableRow
                      key={line.employeeId}
                      href={`/hrms/payslips/${line.employeeId}?month=${month}`}
                      label={`Open payslip for ${line.employeeName}`}
                    >
                      <TableCell className="tabular-nums">{line.employeeCode}</TableCell>
                      <TableCell className="font-medium">{line.employeeName}</TableCell>
                      <TableCell>{line.department}</TableCell>
                      <TableCell>{month}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(line.gross)}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(line.totalDeductions)}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatINR(line.net)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{line.status}</Badge>
                      </TableCell>
                      <TableCell className="relative z-20 text-right">
                        <PayslipDownloadButton
                          company={COMPANY}
                          month={month}
                          line={line}
                          designation={emp?.designation ?? "—"}
                        />
                      </TableCell>
                    </ClickableTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <p className="mt-3 text-xs text-muted-foreground">
          {EMPLOYEES.length} employees · Company: {COMPANY}.{" "}
          <Link href="/hrms/payroll" className="text-primary hover:underline">
            Open payroll
          </Link>
        </p>
      </PageBody>
    </div>
  );
}
