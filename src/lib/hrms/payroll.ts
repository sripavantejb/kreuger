import { ATTENDANCE, EMPLOYEES, getEmployee, LEAVE_REQUESTS } from "./mock-data";
import type { PayrollLine, PayrollRun, PayrollStatus } from "./types";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function monthPrefix(month: string) {
  return month; // YYYY-MM
}

function isWorkingCalendarDay(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay() !== 0;
}

export function calculatePayrollLine(
  employeeId: string,
  month: string,
  status: PayrollStatus = "Calculated"
): PayrollLine | null {
  const emp = getEmployee(employeeId);
  if (!emp || emp.status === "Inactive") return null;

  const [y, m] = month.split("-").map(Number);
  const dim = daysInMonth(y, m);
  const prefix = monthPrefix(month);

  let workingDays = 0;
  for (let day = 1; day <= dim; day++) {
    const ds = `${prefix}-${String(day).padStart(2, "0")}`;
    if (isWorkingCalendarDay(ds)) workingDays++;
  }

  const monthAtt = ATTENDANCE.filter((a) => a.employeeId === emp.id && a.date.startsWith(prefix));
  const present = monthAtt.filter((a) =>
    a.status === "Present" || a.status === "Late" || a.status === "Half Day"
  ).length;
  const halfDays = monthAtt.filter((a) => a.status === "Half Day").length;
  const leave = monthAtt.filter((a) => a.status === "Leave").length;
  const absent = monthAtt.filter((a) => a.status === "Absent").length;
  const lopFromLeave = LEAVE_REQUESTS.filter(
    (l) =>
      l.employeeId === emp.id &&
      l.status === "Approved" &&
      l.leaveType === "Loss of Pay" &&
      (l.from.startsWith(prefix) || l.to.startsWith(prefix))
  ).reduce((sum, l) => sum + l.days, 0);

  const presentEffective = present - halfDays * 0.5;
  const lop = absent + lopFromLeave;
  const overtimeMinutes = monthAtt.reduce((s, a) => s + a.overtimeMinutes, 0);
  const overtimeHours = Math.round((overtimeMinutes / 60) * 100) / 100;

  const basic = Math.round(emp.salary * 0.5);
  const hra = Math.round(emp.salary * 0.2);
  const allowances = Math.round(emp.salary * 0.15);
  const hourly = emp.salary / Math.max(workingDays * 8, 1);
  const overtimePay = Math.round(overtimeHours * hourly * 1.5);
  const bonus = emp.employmentType === "Intern" ? 0 : Math.round(rndBonus(emp.id, month) * 2000);

  const gross = basic + hra + allowances + overtimePay + bonus;

  const dailyRate = emp.salary / Math.max(workingDays, 1);
  const lopDeduction = Math.round(lop * dailyRate);
  const pf = Math.round(Math.min(basic, 15000) * 0.12);
  const professionalTax = gross > 15000 ? 200 : 0;
  const tds = Math.round(Math.max(0, gross - 50000) * 0.05);
  const otherDeductions = emp.employmentType === "Contract" ? 500 : 0;
  const totalDeductions = pf + professionalTax + tds + lopDeduction + otherDeductions;
  const net = Math.max(0, gross - totalDeductions);

  return {
    employeeId: emp.id,
    employeeCode: emp.employeeId,
    employeeName: emp.name,
    department: emp.department,
    workingDays,
    present: presentEffective,
    leave,
    lop,
    overtimeHours,
    basic,
    hra,
    allowances,
    overtimePay,
    bonus,
    gross,
    pf,
    professionalTax,
    tds,
    lopDeduction,
    otherDeductions,
    totalDeductions,
    net,
    status,
  };
}

function rndBonus(employeeId: string, month: string): number {
  let h = 0;
  const s = employeeId + month;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 100) / 100 < 0.25 ? 1 : 0;
}

export function calculatePayroll(month: string, status: PayrollStatus = "Calculated"): PayrollRun {
  const lines = EMPLOYEES.filter((e) => e.status !== "Inactive")
    .map((e) => calculatePayrollLine(e.id, month, status))
    .filter((l): l is PayrollLine => Boolean(l));

  return {
    month,
    status,
    lines,
    calculatedAt: new Date().toISOString(),
  };
}

export function payrollTotals(run: PayrollRun) {
  return {
    gross: run.lines.reduce((s, l) => s + l.gross, 0),
    net: run.lines.reduce((s, l) => s + l.net, 0),
    deductions: run.lines.reduce((s, l) => s + l.totalDeductions, 0),
    overtime: run.lines.reduce((s, l) => s + l.overtimePay, 0),
    lop: run.lines.reduce((s, l) => s + l.lopDeduction, 0),
  };
}
