"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { updateDepartment } from "@/lib/actions";

type Department = {
  id: string;
  name: string;
  headcount: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};

function Row({ dept, readOnly }: { dept: Department; readOnly: boolean }) {
  const [headcount, setHeadcount] = useState(dept.headcount);
  const [rate, setRate] = useState(dept.unitsPerWorkerPerDay);
  const [ceiling, setCeiling] = useState(dept.maxUnitsPerDay);
  const [pending, startTransition] = useTransition();

  const dirty = headcount !== dept.headcount || rate !== dept.unitsPerWorkerPerDay || ceiling !== dept.maxUnitsPerDay;

  function save() {
    startTransition(async () => {
      await updateDepartment({ id: dept.id, headcount, unitsPerWorkerPerDay: rate, maxUnitsPerDay: ceiling });
      toast.success(`${dept.name} updated`);
    });
  }

  return (
    <TableRow className="h-14">
      <TableCell className="font-medium">{dept.name}</TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={headcount}
          disabled={readOnly}
          onChange={(e) => setHeadcount(Number(e.target.value) || 0)}
          className="w-24"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={0.05}
          value={rate}
          disabled={readOnly}
          onChange={(e) => setRate(Number(e.target.value) || 0)}
          className="w-28"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          value={ceiling}
          disabled={readOnly}
          onChange={(e) => setCeiling(Number(e.target.value) || 0)}
          className="w-24"
        />
      </TableCell>
      <TableCell className="text-right">
        {!readOnly && (
          <Button size="sm" variant="outline" onClick={save} disabled={!dirty || pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function DepartmentsTable({ departments, readOnly = false }: { departments: Department[]; readOnly?: boolean }) {
  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Department</TableHead>
            <TableHead>Headcount</TableHead>
            <TableHead>Units / worker / day</TableHead>
            <TableHead>Ceiling (units/day)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {departments.map((d) => (
            <Row key={d.id} dept={d} readOnly={readOnly} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
