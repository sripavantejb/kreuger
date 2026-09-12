"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
import { StatCard } from "@/components/layout/stat-card";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AttendanceOverviewChart,
  DepartmentEmployeesChart,
  MonthlyPayrollChart,
} from "@/components/hrms/charts";
import {
  ATTENDANCE,
  EMPLOYEES,
  HRMS_DEPARTMENTS,
  HRMS_TODAY,
  attendanceOverviewSeries,
  calculatePayroll,
  departmentEmployeeSeries,
  monthlyPayrollSeries,
  payrollTotals,
} from "@/lib/hrms";
import { formatINR } from "@/lib/format";

export function HrmsReportsClient() {
  const [month, setMonth] = useState(HRMS_TODAY.slice(0, 7));
  const [department, setDepartment] = useState("all");

  const attendanceSeries = attendanceOverviewSeries();
  const deptSeries = departmentEmployeeSeries();
  const payrollSeries = monthlyPayrollSeries();

  const monthAtt = useMemo(() => {
    return ATTENDANCE.filter((a) => {
      if (!a.date.startsWith(month)) return false;
      if (department === "all") return true;
      const emp = EMPLOYEES.find((e) => e.id === a.employeeId);
      return emp?.department === department;
    });
  }, [month, department]);

  const attStats = useMemo(() => {
    const countable = monthAtt.filter((a) => !["Holiday", "Week Off"].includes(a.status));
    return {
      present: countable.filter((a) => ["Present", "Half Day"].includes(a.status)).length,
      absent: countable.filter((a) => a.status === "Absent").length,
      leave: countable.filter((a) => a.status === "Leave").length,
      late: countable.filter((a) => a.status === "Late" || a.lateMinutes > 0).length,
      overtime: Math.round(countable.reduce((s, a) => s + a.overtimeMinutes, 0) / 60),
    };
  }, [monthAtt]);

  const payroll = useMemo(() => {
    const run = calculatePayroll(month, "Calculated");
    const lines =
      department === "all" ? run.lines : run.lines.filter((l) => l.department === department);
    return payrollTotals({ ...run, lines });
  }, [month, department]);

  const employeeStats = useMemo(() => {
    const list =
      department === "all"
        ? EMPLOYEES
        : EMPLOYEES.filter((e) => e.department === department);
    const active = list.filter((e) => e.status === "Active").length;
    const inactive = list.filter((e) => e.status !== "Active").length;
    const newJoiners = list.filter((e) => e.joiningDate.startsWith("2025") || e.joiningDate.startsWith("2026")).length;
    return { total: list.length, active, inactive, newJoiners };
  }, [department]);

  const attendanceCsv = [
    {
      Month: month,
      Department: department === "all" ? "All" : department,
      Present: attStats.present,
      Absent: attStats.absent,
      Leave: attStats.leave,
      Late: attStats.late,
      "Overtime (hrs)": attStats.overtime,
    },
  ];

  const payrollCsv = [
    {
      Month: month,
      Department: department === "all" ? "All" : department,
      Gross: payroll.gross,
      Net: payroll.net,
      Deductions: payroll.deductions,
      Overtime: payroll.overtime,
      LOP: payroll.lop,
    },
  ];

  return (
    <div>
      <PageHeader
        title="HR Reports"
        description="Attendance, payroll, and workforce distribution with filters and CSV export."
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton filename={`hrms-attendance-${month}.csv`} rows={attendanceCsv} />
            <ExportCsvButton filename={`hrms-payroll-${month}.csv`} rows={payrollCsv} />
          </div>
        }
      />
      <PageBody className="space-y-8">
        <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="report-month">Month</Label>
            <Input
              id="report-month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v ?? "all")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {HRMS_DEPARTMENTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <SectionTitle>Attendance Report</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Present" value={attStats.present} tone="ok" />
            <StatCard label="Absent" value={attStats.absent} tone="danger" />
            <StatCard label="Leave" value={attStats.leave} tone="warn" />
            <StatCard label="Late" value={attStats.late} />
            <StatCard label="Overtime (hrs)" value={attStats.overtime} />
          </div>
        </div>

        <div>
          <SectionTitle>Payroll Report</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="Gross Payroll" value={formatINR(payroll.gross)} />
            <StatCard label="Net Payroll" value={formatINR(payroll.net)} />
            <StatCard label="Deductions" value={formatINR(payroll.deductions)} />
            <StatCard label="Overtime Pay" value={formatINR(payroll.overtime)} />
            <StatCard label="LOP Deductions" value={formatINR(payroll.lop)} />
          </div>
        </div>

        <div>
          <SectionTitle>Employee Report</SectionTitle>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Employees" value={employeeStats.total} />
            <StatCard label="Active" value={employeeStats.active} tone="ok" />
            <StatCard label="Inactive / Notice" value={employeeStats.inactive} />
            <StatCard label="New Joiners (2025–26)" value={employeeStats.newJoiners} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceOverviewChart data={attendanceSeries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentEmployeesChart data={deptSeries} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payroll Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyPayrollChart data={payrollSeries} />
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}
