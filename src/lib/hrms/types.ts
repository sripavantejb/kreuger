export type EmploymentType = "Full-time" | "Contract" | "Intern" | "Probation";
export type EmployeeStatus = "Active" | "Inactive" | "On Notice";

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Half Day"
  | "Leave"
  | "Holiday"
  | "Week Off"
  | "Late";

export type LeaveType =
  | "Casual Leave"
  | "Sick Leave"
  | "Earned Leave"
  | "Optional Holiday"
  | "Maternity Leave"
  | "Paternity Leave"
  | "Loss of Pay";

export type LeaveStatus = "Pending" | "Approved" | "Rejected";

export type PayrollStatus = "Draft" | "Calculated" | "Pending Approval" | "Approved" | "Paid";

export type ShiftId = "general" | "morning" | "evening" | "night";

export interface Shift {
  id: ShiftId;
  name: string;
  start: string; // HH:mm
  end: string;
  label: string;
}

export interface Employee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string;
  department: string;
  designation: string;
  joiningDate: string; // ISO date
  reportingManagerId: string | null;
  shiftId: ShiftId;
  employmentType: EmploymentType;
  salary: number; // monthly CTC / gross base
  status: EmployeeStatus;
}

export interface BiometricPunch {
  id: string;
  employeeId: string;
  deviceId: string;
  punchedAt: string; // ISO datetime
  type: "IN" | "OUT";
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // HH:mm
  checkOut: string | null;
  workingHours: number;
  lateMinutes: number;
  overtimeMinutes: number;
  status: AttendanceStatus;
  source: "biometric" | "manual" | "leave" | "holiday" | "weekoff";
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  appliedOn: string;
  status: LeaveStatus;
}

export interface PayrollLine {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  workingDays: number;
  present: number;
  leave: number;
  lop: number;
  overtimeHours: number;
  basic: number;
  hra: number;
  allowances: number;
  overtimePay: number;
  bonus: number;
  gross: number;
  pf: number;
  professionalTax: number;
  tds: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  net: number;
  status: PayrollStatus;
}

export interface PayrollRun {
  month: string; // YYYY-MM
  status: PayrollStatus;
  lines: PayrollLine[];
  calculatedAt: string | null;
}

export interface BiometricDevice {
  name: string;
  deviceId: string;
  location: string;
  status: "Connected" | "Disconnected" | "Syncing";
  lastSync: string;
  mode: "Demo / Mock Data";
}

export interface SyncLog {
  id: string;
  at: string;
  message: string;
  level: "info" | "success" | "warn";
}

export interface HrActivity {
  id: string;
  at: string;
  message: string;
}
