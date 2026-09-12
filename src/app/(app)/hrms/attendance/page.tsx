import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceFilters } from "@/components/hrms/attendance-filters";
import { ATTENDANCE, EMPLOYEES, HRMS_TODAY, getEmployee, getShift } from "@/lib/hrms";
import { formatDate } from "@/lib/format";

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const date = typeof sp.date === "string" ? sp.date : HRMS_TODAY;
  const department = typeof sp.department === "string" ? sp.department : "all";
  const employee = typeof sp.employee === "string" ? sp.employee : "all";
  const status = typeof sp.status === "string" ? sp.status : "all";
  const shift = typeof sp.shift === "string" ? sp.shift : "all";

  const rows = ATTENDANCE.filter((a) => a.date === date)
    .map((a) => {
      const emp = getEmployee(a.employeeId);
      return emp ? { a, emp } : null;
    })
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .filter(({ emp, a }) => {
      if (department !== "all" && emp.department !== department) return false;
      if (employee !== "all" && emp.id !== employee) return false;
      if (status !== "all" && a.status !== status) return false;
      if (shift !== "all" && emp.shiftId !== shift) return false;
      return true;
    })
    .sort((x, y) => x.emp.name.localeCompare(y.emp.name));

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Daily attendance derived from mock biometric punches and assigned shifts."
      />
      <PageBody className="space-y-4">
        <Suspense fallback={null}>
          <AttendanceFilters
            employees={EMPLOYEES.map((e) => ({ id: e.id, name: e.name }))}
          />
        </Suspense>

        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Working Hours</TableHead>
                  <TableHead>Late Minutes</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                      No attendance rows for these filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ a, emp }) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{emp.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {emp.employeeId} · {getShift(emp.shiftId).name}
                        </div>
                      </TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell className="tabular-nums">{a.checkIn ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{a.checkOut ?? "—"}</TableCell>
                      <TableCell className="tabular-nums">{a.workingHours || "—"}</TableCell>
                      <TableCell className="tabular-nums">{a.lateMinutes || "—"}</TableCell>
                      <TableCell className="tabular-nums">
                        {a.overtimeMinutes ? `${a.overtimeMinutes}m` : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}
