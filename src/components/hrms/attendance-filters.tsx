"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HRMS_DEPARTMENTS, SHIFTS } from "@/lib/hrms";

const STATUSES = ["Present", "Absent", "Half Day", "Leave", "Holiday", "Week Off", "Late"] as const;

export function AttendanceFilters({
  employees,
}: {
  employees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [date, setDate] = useState(params.get("date") ?? "2026-09-12");
  const [department, setDepartment] = useState(params.get("department") ?? "all");
  const [employee, setEmployee] = useState(params.get("employee") ?? "all");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [shift, setShift] = useState(params.get("shift") ?? "all");

  const filteredEmployees = useMemo(() => {
    if (department === "all") return employees;
    // employee list is flat; department filter applied server-side too
    return employees;
  }, [employees, department]);

  function push(next: Record<string, string>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") q.delete(k);
      else q.set(k, v);
    }
    router.push(`/hrms/attendance?${q.toString()}`);
  }

  return (
    <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
      <div className="space-y-1.5">
        <Label htmlFor="att-date">Date</Label>
        <Input
          id="att-date"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            push({ date: e.target.value });
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label>Department</Label>
        <Select
          value={department}
          onValueChange={(v) => {
            const val = v ?? "all";
            setDepartment(val);
            push({ department: val });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {HRMS_DEPARTMENTS.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Employee</Label>
        <Select
          value={employee}
          onValueChange={(v) => {
            const val = v ?? "all";
            setEmployee(val);
            push({ employee: val });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {filteredEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Status</Label>
        <Select
          value={status}
          onValueChange={(v) => {
            const val = v ?? "all";
            setStatus(val);
            push({ status: val });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Shift</Label>
        <Select
          value={shift}
          onValueChange={(v) => {
            const val = v ?? "all";
            setShift(val);
            push({ shift: val });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All shifts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All shifts</SelectItem>
            {SHIFTS.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
