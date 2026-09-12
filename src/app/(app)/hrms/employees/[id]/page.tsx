import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ATTENDANCE,
  LEAVE_REQUESTS,
  getEmployee,
  getEmployeeManager,
  getShift,
} from "@/lib/hrms";
import { formatDate, formatINR } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const emp = getEmployee(id);
  if (!emp) notFound();

  const manager = getEmployeeManager(emp);
  const shift = getShift(emp.shiftId);
  const recentAtt = ATTENDANCE.filter((a) => a.employeeId === emp.id)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const leaves = LEAVE_REQUESTS.filter((l) => l.employeeId === emp.id);

  return (
    <div>
      <PageHeader
        title={emp.name}
        description={`${emp.employeeId} · ${emp.designation} · ${emp.department}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/hrms/employees" />}>
            <ArrowLeft className="size-4" />
            Back to employees
          </Button>
        }
      />
      <PageBody className="space-y-8">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emp.avatarUrl}
                alt={emp.name}
                className="size-24 rounded-full bg-secondary object-cover"
              />
              <div>
                <div className="text-lg font-semibold">{emp.name}</div>
                <div className="text-sm text-muted-foreground">{emp.designation}</div>
              </div>
              <Badge variant={emp.status === "Active" ? "secondary" : "outline"}>{emp.status}</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <Field label="Employee ID" value={emp.employeeId} />
              <Field label="Email" value={emp.email} />
              <Field label="Phone" value={emp.phone} />
              <Field label="Department" value={emp.department} />
              <Field label="Designation" value={emp.designation} />
              <Field label="Joining Date" value={formatDate(emp.joiningDate)} />
              <Field label="Reporting Manager" value={manager?.name ?? "—"} />
              <Field label="Shift" value={`${shift.name} (${shift.label})`} />
              <Field label="Employment Type" value={emp.employmentType} />
              <Field label="Monthly Salary" value={formatINR(emp.salary)} />
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionTitle>Recent Attendance</SectionTitle>
          <Card className="py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>OT</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentAtt.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{formatDate(a.date)}</TableCell>
                      <TableCell>{a.checkIn ?? "—"}</TableCell>
                      <TableCell>{a.checkOut ?? "—"}</TableCell>
                      <TableCell>{a.workingHours || "—"}</TableCell>
                      <TableCell>{a.lateMinutes ? `${a.lateMinutes}m` : "—"}</TableCell>
                      <TableCell>{a.overtimeMinutes ? `${a.overtimeMinutes}m` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{a.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionTitle>Leave History</SectionTitle>
          <Card className="py-0">
            <CardContent className="p-0">
              {leaves.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-muted-foreground">No leave requests.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell>{l.leaveType}</TableCell>
                        <TableCell>{formatDate(l.from)}</TableCell>
                        <TableCell>{formatDate(l.to)}</TableCell>
                        <TableCell>{l.days}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{l.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
