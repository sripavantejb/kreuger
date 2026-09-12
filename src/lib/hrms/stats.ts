import {
  ATTENDANCE,
  EMPLOYEES,
  HRMS_TODAY,
  LEAVE_REQUESTS,
} from "./mock-data";
import { calculatePayroll, payrollTotals } from "./payroll";

export function hrmsDashboardStats() {
  const active = EMPLOYEES.filter((e) => e.status === "Active" || e.status === "On Notice");
  const today = ATTENDANCE.filter((a) => a.date === HRMS_TODAY);
  const presentToday = today.filter((a) =>
    a.status === "Present" || a.status === "Late" || a.status === "Half Day"
  ).length;
  const absentToday = today.filter((a) => a.status === "Absent").length;
  const onLeaveToday = today.filter((a) => a.status === "Leave").length;
  const lateToday = today.filter((a) => a.status === "Late" || a.lateMinutes > 0).length;
  const pendingLeaves = LEAVE_REQUESTS.filter((l) => l.status === "Pending").length;

  const month = HRMS_TODAY.slice(0, 7);
  const monthAtt = ATTENDANCE.filter((a) => a.date.startsWith(month));
  const countable = monthAtt.filter(
    (a) => !["Holiday", "Week Off"].includes(a.status)
  );
  const presentish = countable.filter((a) =>
    ["Present", "Late", "Half Day"].includes(a.status)
  ).length;
  const attendancePct =
    countable.length === 0 ? 0 : Math.round((presentish / countable.length) * 1000) / 10;

  const payroll = calculatePayroll(month, "Pending Approval");
  const totals = payrollTotals(payroll);

  return {
    totalEmployees: active.length,
    presentToday,
    absentToday,
    onLeaveToday,
    lateToday,
    pendingLeaves,
    currentMonthPayroll: totals.net,
    attendancePct,
    payrollMonth: month,
  };
}

export function attendanceOverviewSeries() {
  const byDate = new Map<string, { present: number; absent: number; leave: number; late: number }>();
  for (const a of ATTENDANCE) {
    if (["Holiday", "Week Off"].includes(a.status)) continue;
    const row = byDate.get(a.date) ?? { present: 0, absent: 0, leave: 0, late: 0 };
    if (a.status === "Absent") row.absent++;
    else if (a.status === "Leave") row.leave++;
    else if (a.status === "Late") {
      row.late++;
      row.present++;
    } else if (a.status === "Present" || a.status === "Half Day") row.present++;
    byDate.set(a.date, row);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14)
    .map(([date, v]) => ({
      date: date.slice(5),
      Present: v.present,
      Absent: v.absent,
      Leave: v.leave,
      Late: v.late,
    }));
}

export function departmentEmployeeSeries() {
  const map = new Map<string, number>();
  for (const e of EMPLOYEES) {
    if (e.status === "Inactive") continue;
    map.set(e.department, (map.get(e.department) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export function monthlyPayrollSeries() {
  const months: string[] = [];
  const [y, m] = HRMS_TODAY.split("-").map(Number);
  for (let i = 5; i >= 0; i--) {
    let mm = m - i;
    let yy = y;
    while (mm <= 0) {
      mm += 12;
      yy -= 1;
    }
    months.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return months.map((month) => {
    const run = calculatePayroll(month, "Paid");
    const t = payrollTotals(run);
    return {
      month: month.slice(5),
      Gross: t.gross,
      Net: t.net,
      Deductions: t.deductions,
    };
  });
}

export function leaveStatisticsSeries() {
  const map = new Map<string, number>();
  for (const l of LEAVE_REQUESTS) {
    map.set(l.leaveType, (map.get(l.leaveType) ?? 0) + l.days);
  }
  return [...map.entries()].map(([type, days]) => ({ type, days }));
}
