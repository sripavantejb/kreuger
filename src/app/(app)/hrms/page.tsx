import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AttendanceOverviewChart,
  DepartmentEmployeesChart,
  LeaveStatisticsChart,
  MonthlyPayrollChart,
} from "@/components/hrms/charts";
import {
  HR_ACTIVITY,
  attendanceOverviewSeries,
  departmentEmployeeSeries,
  hrmsDashboardStats,
  leaveStatisticsSeries,
  monthlyPayrollSeries,
} from "@/lib/hrms";
import { formatDateTime, formatINR } from "@/lib/format";
import {
  Users,
  UserCheck,
  UserX,
  CalendarOff,
  Clock,
  Inbox,
  Wallet,
  Percent,
} from "lucide-react";

export default function HrmsDashboardPage() {
  const stats = hrmsDashboardStats();
  const attendance = attendanceOverviewSeries();
  const departments = departmentEmployeeSeries();
  const payroll = monthlyPayrollSeries();
  const leaves = leaveStatisticsSeries();

  return (
    <div>
      <PageHeader
        title="HRMS Dashboard"
        description="Workforce snapshot — attendance, leave, payroll, and recent HR activity."
        help={{
          content: (
            <>
              <p>HRMS runs on shared mock employee, attendance, and biometric data.</p>
              <p>Biometric sync is in demo mode via the eSSL abstraction — ready to swap for a live device later.</p>
            </>
          ),
        }}
      />
      <PageBody className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Total Employees" value={stats.totalEmployees} icon={<Users className="size-4" />} />
          <StatCard label="Present Today" value={stats.presentToday} tone="ok" icon={<UserCheck className="size-4" />} />
          <StatCard label="Absent Today" value={stats.absentToday} tone={stats.absentToday ? "danger" : "default"} icon={<UserX className="size-4" />} />
          <StatCard label="On Leave" value={stats.onLeaveToday} tone="warn" icon={<CalendarOff className="size-4" />} />
          <StatCard label="Late Arrivals" value={stats.lateToday} tone={stats.lateToday ? "warn" : "default"} icon={<Clock className="size-4" />} />
          <StatCard label="Pending Leave Requests" value={stats.pendingLeaves} icon={<Inbox className="size-4" />} />
          <StatCard
            label="Current Month Payroll"
            value={formatINR(stats.currentMonthPayroll)}
            hint={stats.payrollMonth}
            icon={<Wallet className="size-4" />}
          />
          <StatCard
            label="Attendance %"
            value={`${stats.attendancePct}%`}
            tone={stats.attendancePct >= 90 ? "ok" : "warn"}
            hint="This month"
            icon={<Percent className="size-4" />}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attendance Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceOverviewChart data={attendance} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Department-wise Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentEmployeesChart data={departments} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Monthly Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyPayrollChart data={payroll} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Leave Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <LeaveStatisticsChart data={leaves} />
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionTitle>Recent HR Activity</SectionTitle>
          <Card className="py-0">
            <CardContent className="divide-y divide-border p-0">
              {HR_ACTIVITY.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-foreground">{item.message}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.at)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}
