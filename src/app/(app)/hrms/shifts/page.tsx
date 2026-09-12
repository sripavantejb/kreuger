import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMPLOYEES, SHIFTS, getShift } from "@/lib/hrms";
import { Clock3 } from "lucide-react";

export default function ShiftsPage() {
  return (
    <div>
      <PageHeader
        title="Shifts"
        description="Shift definitions used for late, overtime, and attendance calculations."
      />
      <PageBody className="space-y-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SHIFTS.map((shift) => {
            const count = EMPLOYEES.filter((e) => e.shiftId === shift.id && e.status !== "Inactive").length;
            return (
              <Card key={shift.id}>
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-secondary">
                      <Clock3 className="size-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{shift.name}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{shift.label}</div>
                      <Badge variant="secondary" className="mt-3">
                        {count} employees
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div>
          <SectionTitle>Employee Shift Assignments</SectionTitle>
          <Card className="py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Timing</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {EMPLOYEES.map((emp) => {
                    const shift = getShift(emp.shiftId);
                    return (
                      <TableRow key={emp.id}>
                        <TableCell>
                          <div className="font-medium">{emp.name}</div>
                          <div className="text-xs text-muted-foreground">{emp.employeeId}</div>
                        </TableCell>
                        <TableCell>{emp.department}</TableCell>
                        <TableCell>{shift.name}</TableCell>
                        <TableCell>{shift.label}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.status}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}
