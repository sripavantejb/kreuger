"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setProductDepartmentRate, clearProductDepartmentRate } from "@/lib/actions-master-data";
import { RotateCcw } from "lucide-react";

type Department = {
  id: string;
  name: string;
  sequence: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
};
type Override = { departmentId: string; unitsPerWorkerPerDay: number; maxUnitsPerDay: number };

function Row({
  productId,
  department,
  override,
  readOnly,
}: {
  productId: string;
  department: Department;
  override: Override | undefined;
  readOnly: boolean;
}) {
  const isCustom = !!override;
  const [rate, setRate] = useState(override?.unitsPerWorkerPerDay ?? department.unitsPerWorkerPerDay);
  const [ceiling, setCeiling] = useState(override?.maxUnitsPerDay ?? department.maxUnitsPerDay);
  const [pending, startTransition] = useTransition();
  const [resetting, startReset] = useTransition();

  const dirty =
    rate !== (override?.unitsPerWorkerPerDay ?? department.unitsPerWorkerPerDay) ||
    ceiling !== (override?.maxUnitsPerDay ?? department.maxUnitsPerDay);

  return (
    <TableRow className="h-14">
      <TableCell className="font-medium">
        {department.name}
        <div className="mt-0.5">
          {isCustom ? (
            <Badge variant="outline" className="border-transparent bg-[var(--status-warn-bg)] text-[var(--status-warn)]">
              Custom
            </Badge>
          ) : (
            <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
              Using default
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {department.unitsPerWorkerPerDay} / {department.maxUnitsPerDay}
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={0}
          step={0.05}
          value={rate}
          disabled={readOnly}
          onChange={(e) => setRate(Number(e.target.value) || 0)}
          className="w-24"
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
      {!readOnly && (
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!dirty || pending}
              onClick={() =>
                startTransition(async () => {
                  await setProductDepartmentRate({
                    productId,
                    departmentId: department.id,
                    unitsPerWorkerPerDay: rate,
                    maxUnitsPerDay: ceiling,
                  });
                  toast.success(`${department.name} override saved`);
                })
              }
            >
              {pending ? "Saving…" : "Save"}
            </Button>
            {isCustom && (
              <Button
                size="icon-sm"
                variant="ghost"
                title="Reset to default"
                disabled={resetting}
                onClick={() =>
                  startReset(async () => {
                    await clearProductDepartmentRate({ productId, departmentId: department.id });
                    setRate(department.unitsPerWorkerPerDay);
                    setCeiling(department.maxUnitsPerDay);
                    toast.success(`${department.name} reset to default`);
                  })
                }
              >
                <RotateCcw className="size-3.5" />
              </Button>
            )}
          </div>
        </TableCell>
      )}
    </TableRow>
  );
}

export function DepartmentRatesForm({
  productId,
  departments,
  overrides,
  readOnly = false,
}: {
  productId: string;
  departments: Department[];
  overrides: Override[];
  readOnly?: boolean;
}) {
  const overrideByDept = new Map(overrides.map((o) => [o.departmentId, o]));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Custom overrides this product&apos;s units-per-worker-per-day and daily ceiling for that
        department, for every order and manpower plan of this product. Departments without an
        override use the global figures from the Departments tab.
      </p>
      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Global default (rate / ceiling)</TableHead>
              <TableHead>Units / worker / day</TableHead>
              <TableHead>Ceiling (units/day)</TableHead>
              {!readOnly && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((d) => (
                <Row
                  key={d.id}
                  productId={productId}
                  department={d}
                  override={overrideByDept.get(d.id)}
                  readOnly={readOnly}
                />
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
