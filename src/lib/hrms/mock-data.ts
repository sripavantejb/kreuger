import type {
  AttendanceRecord,
  BiometricDevice,
  BiometricPunch,
  Employee,
  HrActivity,
  LeaveRequest,
  Shift,
  SyncLog,
} from "./types";

export const HRMS_DEPARTMENTS = [
  "Engineering",
  "HR",
  "Production",
  "Finance",
  "Sales",
  "Quality",
  "Operations",
  "Admin",
] as const;

export const SHIFTS: Shift[] = [
  { id: "general", name: "General Shift", start: "09:00", end: "18:00", label: "09:00 AM – 06:00 PM" },
  { id: "morning", name: "Morning Shift", start: "06:00", end: "15:00", label: "06:00 AM – 03:00 PM" },
  { id: "evening", name: "Evening Shift", start: "14:00", end: "23:00", label: "02:00 PM – 11:00 PM" },
  { id: "night", name: "Night Shift", start: "22:00", end: "07:00", label: "10:00 PM – 07:00 AM" },
];

export function getShift(id: string): Shift {
  return SHIFTS.find((s) => s.id === id) ?? SHIFTS[0];
}

function avatar(seed: string) {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
}

/** Deterministic pseudo-random 0..1 from string + salt */
function rnd(seed: string, salt = 0): number {
  let h = salt * 2654435761;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 1597334677);
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function pad(n: number, w = 2) {
  return String(n).padStart(w, "0");
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(base: Date, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

function minutesBetween(a: string, b: string): number {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  const start = ah * 60 + am;
  let end = bh * 60 + bm;
  if (end < start) end += 24 * 60; // night shift
  return end - start;
}

function fmtTime(totalMinutes: number): string {
  const m = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

const EMPLOYEE_SEEDS: Array<{
  name: string;
  department: string;
  designation: string;
  shiftId: Employee["shiftId"];
  employmentType: Employee["employmentType"];
  salary: number;
  joiningDate: string;
  status?: Employee["status"];
}> = [
  { name: "Rahul Sharma", department: "Engineering", designation: "Senior Software Engineer", shiftId: "general", employmentType: "Full-time", salary: 95000, joiningDate: "2022-03-14" },
  { name: "Priya Reddy", department: "HR", designation: "HR Business Partner", shiftId: "general", employmentType: "Full-time", salary: 78000, joiningDate: "2021-07-01" },
  { name: "Amit Patel", department: "Production", designation: "Production Supervisor", shiftId: "morning", employmentType: "Full-time", salary: 62000, joiningDate: "2020-11-20" },
  { name: "Sneha Iyer", department: "Finance", designation: "Accounts Manager", shiftId: "general", employmentType: "Full-time", salary: 88000, joiningDate: "2019-05-08" },
  { name: "Vikram Singh", department: "Sales", designation: "Sales Executive", shiftId: "general", employmentType: "Full-time", salary: 55000, joiningDate: "2023-01-16" },
  { name: "Ananya Krishnan", department: "Quality", designation: "QA Lead", shiftId: "general", employmentType: "Full-time", salary: 72000, joiningDate: "2021-09-12" },
  { name: "Mohammed Irfan", department: "Operations", designation: "Operations Manager", shiftId: "general", employmentType: "Full-time", salary: 98000, joiningDate: "2018-04-02" },
  { name: "Kavya Nair", department: "Admin", designation: "Admin Executive", shiftId: "general", employmentType: "Full-time", salary: 42000, joiningDate: "2022-08-22" },
  { name: "Arjun Mehta", department: "Engineering", designation: "Frontend Developer", shiftId: "general", employmentType: "Full-time", salary: 70000, joiningDate: "2023-06-05" },
  { name: "Deepika Rao", department: "Production", designation: "Machine Operator", shiftId: "evening", employmentType: "Full-time", salary: 38000, joiningDate: "2021-02-18" },
  { name: "Suresh Babu", department: "Production", designation: "Shift In-charge", shiftId: "night", employmentType: "Full-time", salary: 48000, joiningDate: "2019-10-30" },
  { name: "Meera Joshi", department: "HR", designation: "Recruitment Specialist", shiftId: "general", employmentType: "Full-time", salary: 52000, joiningDate: "2022-12-01" },
  { name: "Nikhil Verma", department: "Engineering", designation: "DevOps Engineer", shiftId: "general", employmentType: "Full-time", salary: 85000, joiningDate: "2020-06-15" },
  { name: "Lakshmi Devi", department: "Finance", designation: "Payroll Analyst", shiftId: "general", employmentType: "Full-time", salary: 58000, joiningDate: "2021-04-19" },
  { name: "Rohan Gupta", department: "Sales", designation: "Regional Sales Manager", shiftId: "general", employmentType: "Full-time", salary: 92000, joiningDate: "2018-09-03" },
  { name: "Fatima Begum", department: "Quality", designation: "Inspector", shiftId: "morning", employmentType: "Full-time", salary: 36000, joiningDate: "2023-03-27" },
  { name: "Karthik Subramanian", department: "Operations", designation: "Logistics Coordinator", shiftId: "morning", employmentType: "Full-time", salary: 45000, joiningDate: "2022-05-11" },
  { name: "Pooja Desai", department: "Engineering", designation: "QA Engineer", shiftId: "general", employmentType: "Contract", salary: 60000, joiningDate: "2024-01-08" },
  { name: "Harish Kumar", department: "Production", designation: "Assembler", shiftId: "evening", employmentType: "Full-time", salary: 32000, joiningDate: "2020-01-14" },
  { name: "Divya Menon", department: "Admin", designation: "Office Coordinator", shiftId: "general", employmentType: "Full-time", salary: 40000, joiningDate: "2023-08-21" },
  { name: "Sanjay Pillai", department: "Engineering", designation: "Backend Developer", shiftId: "general", employmentType: "Full-time", salary: 75000, joiningDate: "2021-11-29" },
  { name: "Neha Kapoor", department: "Sales", designation: "Inside Sales Associate", shiftId: "general", employmentType: "Probation", salary: 35000, joiningDate: "2025-11-03" },
  { name: "Ravi Teja", department: "Production", designation: "Maintenance Technician", shiftId: "night", employmentType: "Full-time", salary: 41000, joiningDate: "2019-07-16" },
  { name: "Aisha Khan", department: "HR", designation: "HR Intern", shiftId: "general", employmentType: "Intern", salary: 18000, joiningDate: "2026-01-06" },
  { name: "Gopal Krishna", department: "Finance", designation: "Senior Accountant", shiftId: "general", employmentType: "Full-time", salary: 68000, joiningDate: "2017-12-04" },
  { name: "Swathi Reddy", department: "Quality", designation: "Process Auditor", shiftId: "general", employmentType: "Full-time", salary: 54000, joiningDate: "2022-02-28" },
  { name: "Manish Agarwal", department: "Operations", designation: "Warehouse Lead", shiftId: "morning", employmentType: "Full-time", salary: 50000, joiningDate: "2020-08-10" },
  { name: "Ishita Bose", department: "Engineering", designation: "Product Designer", shiftId: "general", employmentType: "Full-time", salary: 72000, joiningDate: "2023-09-18" },
  { name: "Prakash Yadav", department: "Production", designation: "Packaging Operator", shiftId: "evening", employmentType: "Contract", salary: 28000, joiningDate: "2024-06-03" },
  { name: "Nandini Rao", department: "Admin", designation: "Facilities Manager", shiftId: "general", employmentType: "Full-time", salary: 64000, joiningDate: "2019-03-25", status: "On Notice" },
];

const MANAGER_BY_DEPT: Record<string, string> = {
  Engineering: "EMP-007",
  HR: "EMP-002",
  Production: "EMP-003",
  Finance: "EMP-004",
  Sales: "EMP-015",
  Quality: "EMP-006",
  Operations: "EMP-007",
  Admin: "EMP-008",
};

export const EMPLOYEES: Employee[] = EMPLOYEE_SEEDS.map((seed, index) => {
  const employeeId = `EMP-${pad(index + 1, 3)}`;
  const managerCode = MANAGER_BY_DEPT[seed.department];
  const reportingManagerId =
    managerCode && managerCode !== employeeId
      ? managerCode
      : index === 6
        ? null
        : "EMP-007";
  const phoneTail = String(Math.floor(7000000000 + rnd(seed.name, 3) * 2999999999));

  return {
    id: employeeId,
    employeeId,
    name: seed.name,
    email: `${seed.name.toLowerCase().replace(/\s+/g, ".")}@kreuger.in`,
    phone: `+91 ${phoneTail}`,
    avatarUrl: avatar(seed.name),
    department: seed.department,
    designation: seed.designation,
    joiningDate: seed.joiningDate,
    reportingManagerId,
    shiftId: seed.shiftId,
    employmentType: seed.employmentType,
    salary: seed.salary,
    status: seed.status ?? "Active",
  };
});

export function getEmployee(id: string): Employee | undefined {
  return EMPLOYEES.find((e) => e.id === id || e.employeeId === id);
}

export function getEmployeeManager(emp: Employee): Employee | null {
  if (!emp.reportingManagerId) return null;
  return getEmployee(emp.reportingManagerId) ?? null;
}

export const BIOMETRIC_DEVICE: BiometricDevice = {
  name: "eSSL X990",
  deviceId: "ESSL-001",
  location: "Hyderabad Office",
  status: "Connected",
  lastSync: "Today, 09:42 AM",
  mode: "Demo / Mock Data",
};

/** Fixed "today" for consistent demo: 2026-09-12 */
export const HRMS_TODAY = "2026-09-12";

function buildAttendanceWindow(): string[] {
  const end = new Date(`${HRMS_TODAY}T12:00:00`);
  const dates: string[] = [];
  for (let i = 44; i >= 0; i--) {
    dates.push(isoDate(addDays(end, -i)));
  }
  return dates;
}

export const ATTENDANCE_DATES = buildAttendanceWindow();

const HOLIDAYS = new Set(["2026-08-15", "2026-08-27", "2026-09-05"]);

function isSunday(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
}

function generatePunchesAndAttendance(): {
  punches: BiometricPunch[];
  attendance: AttendanceRecord[];
} {
  const punches: BiometricPunch[] = [];
  const attendance: AttendanceRecord[] = [];
  let punchSeq = 1;
  let attSeq = 1;

  for (const emp of EMPLOYEES) {
    if (emp.status === "Inactive") continue;
    const shift = getShift(emp.shiftId);
    const [sh, sm] = shift.start.split(":").map(Number);
    const shiftStartMin = sh * 60 + sm;

    for (const date of ATTENDANCE_DATES) {
      const daySeed = `${emp.id}-${date}`;
      const roll = rnd(daySeed, 1);

      if (HOLIDAYS.has(date)) {
        attendance.push({
          id: `ATT-${pad(attSeq++, 5)}`,
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          status: "Holiday",
          source: "holiday",
        });
        continue;
      }

      if (isSunday(date)) {
        attendance.push({
          id: `ATT-${pad(attSeq++, 5)}`,
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          status: "Week Off",
          source: "weekoff",
        });
        continue;
      }

      // ~6% leave, ~4% absent, rest present/late/half
      if (roll < 0.06) {
        attendance.push({
          id: `ATT-${pad(attSeq++, 5)}`,
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          status: "Leave",
          source: "leave",
        });
        continue;
      }

      if (roll < 0.1) {
        attendance.push({
          id: `ATT-${pad(attSeq++, 5)}`,
          employeeId: emp.id,
          date,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          lateMinutes: 0,
          overtimeMinutes: 0,
          status: "Absent",
          source: "manual",
        });
        continue;
      }

      const lateBias = rnd(daySeed, 2);
      const lateMinutes = lateBias < 0.18 ? Math.floor(5 + rnd(daySeed, 3) * 45) : 0;
      const earlyOut = rnd(daySeed, 4) < 0.08;
      const overtime = rnd(daySeed, 5) < 0.12 ? Math.floor(30 + rnd(daySeed, 6) * 90) : 0;
      const halfDay = rnd(daySeed, 7) < 0.05;

      const inMin = shiftStartMin + lateMinutes + Math.floor(rnd(daySeed, 8) * 4);
      let outMin = inMin + (halfDay ? 240 + Math.floor(rnd(daySeed, 9) * 60) : 540 + overtime);
      if (earlyOut && !halfDay) outMin = inMin + 300 + Math.floor(rnd(daySeed, 10) * 60);

      const checkIn = fmtTime(inMin);
      const checkOut = fmtTime(outMin);
      const worked = minutesBetween(checkIn, checkOut);
      const workingHours = Math.round((worked / 60) * 100) / 100;

      let status: AttendanceRecord["status"] = "Present";
      if (halfDay) status = "Half Day";
      else if (lateMinutes > 0) status = "Late";

      punches.push({
        id: `PUNCH-${pad(punchSeq++, 6)}`,
        employeeId: emp.id,
        deviceId: BIOMETRIC_DEVICE.deviceId,
        punchedAt: `${date}T${checkIn}:00`,
        type: "IN",
      });
      punches.push({
        id: `PUNCH-${pad(punchSeq++, 6)}`,
        employeeId: emp.id,
        deviceId: BIOMETRIC_DEVICE.deviceId,
        punchedAt: `${date}T${checkOut}:00`,
        type: "OUT",
      });

      // occasional missing checkout
      const missingOut = date === HRMS_TODAY && rnd(daySeed, 11) < 0.08;
      attendance.push({
        id: `ATT-${pad(attSeq++, 5)}`,
        employeeId: emp.id,
        date,
        checkIn,
        checkOut: missingOut ? null : checkOut,
        workingHours: missingOut ? Math.round(((inMin ? minutesBetween(checkIn, fmtTime(shiftStartMin + 540)) : 0) / 60) * 10) / 10 : workingHours,
        lateMinutes,
        overtimeMinutes: missingOut ? 0 : overtime,
        status,
        source: "biometric",
      });
    }
  }

  return { punches, attendance };
}

const generated = generatePunchesAndAttendance();
export const BIOMETRIC_PUNCHES: BiometricPunch[] = generated.punches;
export const ATTENDANCE: AttendanceRecord[] = generated.attendance;

export const LEAVE_REQUESTS: LeaveRequest[] = [
  {
    id: "LV-001",
    employeeId: "EMP-002",
    leaveType: "Casual Leave",
    from: "2026-09-15",
    to: "2026-09-16",
    days: 2,
    reason: "Family function in Vijayawada",
    appliedOn: "2026-09-10",
    status: "Pending",
  },
  {
    id: "LV-002",
    employeeId: "EMP-005",
    leaveType: "Sick Leave",
    from: "2026-09-08",
    to: "2026-09-09",
    days: 2,
    reason: "Fever and doctor advised rest",
    appliedOn: "2026-09-07",
    status: "Approved",
  },
  {
    id: "LV-003",
    employeeId: "EMP-010",
    leaveType: "Earned Leave",
    from: "2026-09-22",
    to: "2026-09-26",
    days: 5,
    reason: "Personal travel to Goa",
    appliedOn: "2026-09-05",
    status: "Pending",
  },
  {
    id: "LV-004",
    employeeId: "EMP-018",
    leaveType: "Optional Holiday",
    from: "2026-09-18",
    to: "2026-09-18",
    days: 1,
    reason: "Ganesh immersion day",
    appliedOn: "2026-09-11",
    status: "Pending",
  },
  {
    id: "LV-005",
    employeeId: "EMP-014",
    leaveType: "Casual Leave",
    from: "2026-08-28",
    to: "2026-08-28",
    days: 1,
    reason: "Bank work",
    appliedOn: "2026-08-26",
    status: "Approved",
  },
  {
    id: "LV-006",
    employeeId: "EMP-011",
    leaveType: "Loss of Pay",
    from: "2026-08-19",
    to: "2026-08-20",
    days: 2,
    reason: "Emergency travel — no leave balance",
    appliedOn: "2026-08-18",
    status: "Approved",
  },
  {
    id: "LV-007",
    employeeId: "EMP-022",
    leaveType: "Sick Leave",
    from: "2026-09-11",
    to: "2026-09-12",
    days: 2,
    reason: "Migraine",
    appliedOn: "2026-09-11",
    status: "Pending",
  },
  {
    id: "LV-008",
    employeeId: "EMP-009",
    leaveType: "Paternity Leave",
    from: "2026-10-01",
    to: "2026-10-15",
    days: 15,
    reason: "Newborn care",
    appliedOn: "2026-09-09",
    status: "Pending",
  },
  {
    id: "LV-009",
    employeeId: "EMP-026",
    leaveType: "Casual Leave",
    from: "2026-08-12",
    to: "2026-08-13",
    days: 2,
    reason: "House shifting",
    appliedOn: "2026-08-08",
    status: "Rejected",
  },
  {
    id: "LV-010",
    employeeId: "EMP-016",
    leaveType: "Earned Leave",
    from: "2026-09-01",
    to: "2026-09-03",
    days: 3,
    reason: "Temple visit with family",
    appliedOn: "2026-08-25",
    status: "Approved",
  },
  {
    id: "LV-011",
    employeeId: "EMP-001",
    leaveType: "Casual Leave",
    from: "2026-09-19",
    to: "2026-09-19",
    days: 1,
    reason: "Vehicle service appointment",
    appliedOn: "2026-09-12",
    status: "Pending",
  },
  {
    id: "LV-012",
    employeeId: "EMP-028",
    leaveType: "Maternity Leave",
    from: "2026-07-01",
    to: "2026-12-28",
    days: 180,
    reason: "Maternity leave as per policy",
    appliedOn: "2026-06-10",
    status: "Approved",
  },
];

export const SYNC_LOGS: SyncLog[] = [
  { id: "SL-1", at: "2026-09-12T09:42:00", message: "Full sync completed — 58 punches imported", level: "success" },
  { id: "SL-2", at: "2026-09-12T09:41:40", message: "Connected to eSSL X990 (ESSL-001)", level: "info" },
  { id: "SL-3", at: "2026-09-12T08:00:12", message: "Scheduled morning sync started", level: "info" },
  { id: "SL-4", at: "2026-09-11T18:05:00", message: "Evening sync completed — 54 punches imported", level: "success" },
  { id: "SL-5", at: "2026-09-11T12:00:00", message: "Demo mode: mock punches generated for missing OUT events", level: "warn" },
  { id: "SL-6", at: "2026-09-10T09:40:00", message: "Full sync completed — 56 punches imported", level: "success" },
];

export const HR_ACTIVITY: HrActivity[] = [
  { id: "ACT-1", at: "2026-09-12T09:04:00", message: "Rahul Sharma checked in at 09:04 AM" },
  { id: "ACT-2", at: "2026-09-12T09:12:00", message: "Priya Reddy applied for Casual Leave" },
  { id: "ACT-3", at: "2026-09-12T09:30:00", message: "3 employees have missing checkout" },
  { id: "ACT-4", at: "2026-09-11T17:45:00", message: "August payroll is ready for approval" },
  { id: "ACT-5", at: "2026-09-12T09:42:00", message: "eSSL attendance synced successfully" },
  { id: "ACT-6", at: "2026-09-11T11:20:00", message: "Neha Kapoor joined as Inside Sales Associate" },
  { id: "ACT-7", at: "2026-09-10T16:05:00", message: "Suresh Babu overtime approved — 1.5 hrs" },
  { id: "ACT-8", at: "2026-09-10T10:15:00", message: "Fatima Begum leave approved (Sick Leave)" },
];

export function attendanceForDate(date: string): AttendanceRecord[] {
  return ATTENDANCE.filter((a) => a.date === date);
}

export function attendanceForEmployee(employeeId: string): AttendanceRecord[] {
  return ATTENDANCE.filter((a) => a.employeeId === employeeId);
}
