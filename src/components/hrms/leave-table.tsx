"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { LeaveRequest, LeaveStatus } from "@/lib/hrms/types";
import { formatDate } from "@/lib/format";
import { Check, X } from "lucide-react";

type Row = LeaveRequest & { employeeName: string; department: string };

export function LeaveTable({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState(initialRows);

  function setStatus(id: string, status: LeaveStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(status === "Approved" ? "Leave approved" : "Leave rejected");
  }

  return (
    <Card className="py-0">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Leave Type</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Applied On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell>
                  <div className="font-medium">{row.employeeName}</div>
                  <div className="text-xs text-muted-foreground">{row.department}</div>
                </TableCell>
                <TableCell>{row.leaveType}</TableCell>
                <TableCell>{formatDate(row.from)}</TableCell>
                <TableCell>{formatDate(row.to)}</TableCell>
                <TableCell className="tabular-nums">{row.days}</TableCell>
                <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                  {row.reason}
                </TableCell>
                <TableCell>{formatDate(row.appliedOn)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      row.status === "Approved"
                        ? "secondary"
                        : row.status === "Rejected"
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {row.status === "Pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="xs" variant="outline" onClick={() => setStatus(row.id, "Approved")}>
                        <Check className="size-3" />
                        Approve
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => setStatus(row.id, "Rejected")}>
                        <X className="size-3" />
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
