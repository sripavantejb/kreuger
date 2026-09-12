import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EMPLOYEES, getShift } from "@/lib/hrms";
import { formatDate } from "@/lib/format";
import { Eye } from "lucide-react";

function statusVariant(status: string) {
  if (status === "Active") return "secondary" as const;
  if (status === "On Notice") return "outline" as const;
  return "destructive" as const;
}

export default function HrmsEmployeesPage() {
  return (
    <div>
      <PageHeader
        title="Employees"
        description={`${EMPLOYEES.length} employees across departments, shifts, and employment types.`}
      />
      <PageBody>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Shift</TableHead>
                  <TableHead>Employment Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EMPLOYEES.map((emp) => {
                  const shift = getShift(emp.shiftId);
                  return (
                    <ClickableTableRow
                      key={emp.id}
                      href={`/hrms/employees/${emp.id}`}
                      label={`Open profile for ${emp.name}`}
                    >
                      <TableCell className="font-medium tabular-nums">{emp.employeeId}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={emp.avatarUrl}
                            alt=""
                            className="size-8 rounded-full bg-secondary object-cover"
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{emp.name}</div>
                            <div className="truncate text-xs text-muted-foreground">{emp.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{emp.department}</TableCell>
                      <TableCell>{emp.designation}</TableCell>
                      <TableCell>{formatDate(emp.joiningDate)}</TableCell>
                      <TableCell>{shift.name}</TableCell>
                      <TableCell>{emp.employmentType}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(emp.status)}>{emp.status}</Badge>
                      </TableCell>
                      <TableCell className="relative z-20 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                          <Eye className="size-3.5" />
                          View
                        </span>
                      </TableCell>
                    </ClickableTableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}
