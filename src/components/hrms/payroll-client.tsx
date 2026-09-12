"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculatePayroll, payrollTotals } from "@/lib/hrms/payroll";
import type { PayrollRun, PayrollStatus } from "@/lib/hrms/types";
import { formatINR } from "@/lib/format";
import { Calculator, CheckCircle2, Eye, RefreshCw } from "lucide-react";

export function PayrollClient({ defaultMonth }: { defaultMonth: string }) {
  const [month, setMonth] = useState(defaultMonth);
  const [run, setRun] = useState<PayrollRun | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const totals = useMemo(() => (run ? payrollTotals(run) : null), [run]);

  function calculate(status: PayrollStatus = "Calculated") {
    const next = calculatePayroll(month, status);
    setRun(next);
    toast.success(`Payroll calculated for ${month}`);
  }

  function recalculate() {
    if (!run) {
      calculate();
      return;
    }
    const next = calculatePayroll(month, run.status === "Draft" ? "Calculated" : run.status);
    setRun(next);
    toast.success("Payroll recalculated");
  }

  function approve() {
    if (!run) return;
    setRun({ ...run, status: "Approved", lines: run.lines.map((l) => ({ ...l, status: "Approved" })) });
    toast.success("Payroll approved");
  }

  const preview = run?.lines.find((l) => l.employeeId === previewId) ?? null;

  const csvRows =
    run?.lines.map((l) => ({
      "Employee ID": l.employeeCode,
      "Employee Name": l.employeeName,
      Department: l.department,
      "Working Days": l.workingDays,
      Present: l.present,
      Leave: l.leave,
      LOP: l.lop,
      Overtime: l.overtimeHours,
      "Gross Salary": l.gross,
      Deductions: l.totalDeductions,
      "Net Salary": l.net,
      Status: l.status,
    })) ?? [];

  return (
    <div>
      <PageHeader
        title="Payroll"
        description="Calculate monthly payroll from employee salary, attendance, overtime, and LOP."
        actions={
          run ? <ExportCsvButton filename={`payroll-${month}.csv`} rows={csvRows} /> : undefined
        }
      />
      <PageBody className="space-y-4">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="payroll-month">Payroll Month</Label>
            <Input
              id="payroll-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => calculate("Calculated")}>
              <Calculator className="size-4" />
              Calculate Payroll
            </Button>
            <Button variant="outline" onClick={recalculate} disabled={!run}>
              <RefreshCw className="size-4" />
              Recalculate
            </Button>
            <Button variant="outline" onClick={() => setPreviewId(run?.lines[0]?.employeeId ?? null)} disabled={!run}>
              <Eye className="size-4" />
              Preview
            </Button>
            <Button variant="outline" onClick={approve} disabled={!run || run.status === "Approved" || run.status === "Paid"}>
              <CheckCircle2 className="size-4" />
              Approve Payroll
            </Button>
          </div>
        </div>

        {run && totals && (
          <div className="grid gap-3 sm:grid-cols-4">
            <Summary label="Status" value={run.status} />
            <Summary label="Gross Payroll" value={formatINR(totals.gross)} />
            <Summary label="Deductions" value={formatINR(totals.deductions)} />
            <Summary label="Net Payroll" value={formatINR(totals.net)} />
          </div>
        )}

        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Working Days</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Leave</TableHead>
                  <TableHead>LOP</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!run ? (
                  <TableRow>
                    <TableCell colSpan={12} className="py-12 text-center text-sm text-muted-foreground">
                      Select a payroll month and click Calculate Payroll.
                    </TableCell>
                  </TableRow>
                ) : (
                  run.lines.map((l) => (
                    <TableRow
                      key={l.employeeId}
                      className="cursor-pointer"
                      onClick={() => setPreviewId(l.employeeId)}
                    >
                      <TableCell className="tabular-nums">{l.employeeCode}</TableCell>
                      <TableCell className="font-medium">{l.employeeName}</TableCell>
                      <TableCell>{l.department}</TableCell>
                      <TableCell className="tabular-nums">{l.workingDays}</TableCell>
                      <TableCell className="tabular-nums">{l.present}</TableCell>
                      <TableCell className="tabular-nums">{l.leave}</TableCell>
                      <TableCell className="tabular-nums">{l.lop}</TableCell>
                      <TableCell className="tabular-nums">{l.overtimeHours}h</TableCell>
                      <TableCell className="tabular-nums">{formatINR(l.gross)}</TableCell>
                      <TableCell className="tabular-nums">{formatINR(l.totalDeductions)}</TableCell>
                      <TableCell className="tabular-nums font-medium">{formatINR(l.net)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{l.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {preview && (
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Preview — {preview.employeeName}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {preview.employeeCode} · {preview.department} · {month}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm sm:col-span-2">
                <Row k="Basic" v={formatINR(preview.basic)} />
                <Row k="HRA" v={formatINR(preview.hra)} />
                <Row k="Allowances" v={formatINR(preview.allowances)} />
                <Row k="Overtime" v={formatINR(preview.overtimePay)} />
                <Row k="Bonus" v={formatINR(preview.bonus)} />
                <Row k="Gross" v={formatINR(preview.gross)} />
                <Row k="PF" v={formatINR(preview.pf)} />
                <Row k="Professional Tax" v={formatINR(preview.professionalTax)} />
                <Row k="TDS" v={formatINR(preview.tds)} />
                <Row k="LOP" v={formatINR(preview.lopDeduction)} />
                <Row k="Other Deductions" v={formatINR(preview.otherDeductions)} />
                <Row k="Net Salary" v={formatINR(preview.net)} />
              </div>
            </CardContent>
          </Card>
        )}
      </PageBody>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border py-1.5">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium tabular-nums">{v}</span>
    </div>
  );
}
