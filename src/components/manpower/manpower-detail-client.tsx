"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangePicker, type DateRange } from "./date-range-picker";
import { ManpowerResultPanel } from "./manpower-result-panel";
import {
  planManpower,
  planManpowerFromWorkers,
  totalWorkingDaysForResult,
  type ManpowerDepartment,
  type ManpowerConstants,
  type ManpowerPlanningMode,
} from "@/lib/manpower";
import { workingDaysBetween, addWorkingDays, type WorkingDayConfig } from "@/lib/working-days";
import { applyProductDepartmentRates, type DepartmentRateOverride } from "@/lib/product-department-rates";
import { saveManpowerPlan } from "@/lib/actions-manpower";

type Material = { materialName: string; unit: string; quantityPerUnit: number };
type ProductOption = {
  id: string;
  name: string;
  code: string;
  materials: Material[];
  departmentRates: DepartmentRateOverride[];
};
type ColourOption = { id: string; name: string };

function defaultWorkersFromDepartments(departments: ManpowerDepartment[]): Record<string, number> {
  return Object.fromEntries(departments.map((d) => [d.id, d.headcount]));
}

export function ManpowerDetailClient({
  oc,
  products,
  colours,
  departments,
  constants,
  workingDayConfig,
  initialRange,
  initialMode,
  initialWorkers,
  initialOvertimeHoursPerDay = 0,
  canWrite,
}: {
  oc: { id: string; ocNumber: string; quantity: number; product: ProductOption; colour: ColourOption };
  products: ProductOption[];
  colours: ColourOption[];
  departments: ManpowerDepartment[];
  constants: ManpowerConstants;
  workingDayConfig: WorkingDayConfig;
  initialRange: DateRange;
  initialMode: ManpowerPlanningMode;
  initialWorkers: Record<string, number>;
  initialOvertimeHoursPerDay?: number;
  canWrite: boolean;
}) {
  const [mode, setMode] = useState<ManpowerPlanningMode>(initialMode);
  const [range, setRange] = useState<DateRange>(initialRange);
  const [workersByDept, setWorkersByDept] = useState<Record<string, number>>(() => ({
    ...defaultWorkersFromDepartments(departments),
    ...initialWorkers,
  }));
  const [overtimeOn, setOvertimeOn] = useState(initialOvertimeHoursPerDay > 0);
  const [overtimeHours, setOvertimeHours] = useState(
    initialOvertimeHoursPerDay > 0 ? initialOvertimeHoursPerDay : 2
  );
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideProductId, setOverrideProductId] = useState(oc.product.id);
  const [overrideQuantity, setOverrideQuantity] = useState(oc.quantity);
  const [overrideColourId, setOverrideColourId] = useState(oc.colour.id);
  const [saving, startSaving] = useTransition();

  const overtimeHoursPerDay = overtimeOn ? Math.max(0, overtimeHours) : 0;
  const maxOvertime = Math.max(constants.shiftHours, 6);

  const effectiveProduct = overrideOn
    ? products.find((p) => p.id === overrideProductId) ?? oc.product
    : oc.product;
  const effectiveQuantity = overrideOn ? overrideQuantity : oc.quantity;
  const isWhatIf =
    overrideOn &&
    (overrideProductId !== oc.product.id ||
      overrideQuantity !== oc.quantity ||
      overrideColourId !== oc.colour.id);

  const workingDaysFromRange = useMemo(
    () => workingDaysBetween(range.from, range.to, workingDayConfig),
    [range, workingDayConfig]
  );

  const effectiveDepartments = useMemo(
    () => applyProductDepartmentRates(departments, effectiveProduct.departmentRates),
    [departments, effectiveProduct]
  );

  const dateResult = useMemo(
    () =>
      planManpower(
        effectiveQuantity,
        workingDaysFromRange,
        effectiveDepartments,
        constants,
        effectiveProduct.materials,
        overtimeHoursPerDay
      ),
    [
      effectiveQuantity,
      workingDaysFromRange,
      effectiveDepartments,
      constants,
      effectiveProduct,
      overtimeHoursPerDay,
    ]
  );

  const workerResult = useMemo(
    () =>
      planManpowerFromWorkers(
        effectiveQuantity,
        workersByDept,
        effectiveDepartments,
        constants,
        effectiveProduct.materials,
        overtimeHoursPerDay
      ),
    [
      effectiveQuantity,
      workersByDept,
      effectiveDepartments,
      constants,
      effectiveProduct,
      overtimeHoursPerDay,
    ]
  );

  const result = mode === "workers" ? workerResult : dateResult;

  // Keep the end date in sync when planning by workers.
  const workerScheduleDays =
    workerResult.status === "achievable"
      ? Math.ceil(totalWorkingDaysForResult(workerResult, constants))
      : null;

  useEffect(() => {
    if (mode !== "workers" || workerScheduleDays === null) return;
    const nextEnd = addWorkingDays(range.from, Math.max(workerScheduleDays, 1), workingDayConfig);
    setRange((prev) =>
      nextEnd.getTime() === prev.to.getTime() ? prev : { from: prev.from, to: nextEnd }
    );
  }, [mode, workerScheduleDays, workingDayConfig, range.from]);

  const workingDays =
    mode === "workers" && workerScheduleDays !== null ? workerScheduleDays : workingDaysFromRange;

  const earliestEndDate = useMemo(() => {
    if (result.status === "blocked" && result.earliestWorkingDays !== null) {
      return addWorkingDays(range.from, result.earliestWorkingDays, workingDayConfig);
    }
    return null;
  }, [result, range.from, workingDayConfig]);

  function useEarliestDate() {
    if (earliestEndDate) setRange({ from: range.from, to: earliestEndDate });
  }

  function handleModeChange(next: string | null) {
    if (next !== "date" && next !== "workers") return;
    if (next === "workers") {
      if (dateResult.status === "achievable") {
        setWorkersByDept(
          Object.fromEntries(dateResult.lines.map((line) => [line.departmentId, line.workers]))
        );
      } else {
        setWorkersByDept({
          ...defaultWorkersFromDepartments(departments),
          ...initialWorkers,
        });
      }
    }
    setMode(next);
  }

  function setWorkerCount(departmentId: string, value: number) {
    setWorkersByDept((prev) => ({
      ...prev,
      [departmentId]: Math.max(0, Math.floor(value) || 0),
    }));
  }

  function handleSave() {
    startSaving(async () => {
      try {
        await saveManpowerPlan({
          ocId: oc.id,
          startDate: range.from,
          endDate: range.to,
          mode,
          workersByDepartment: mode === "workers" ? workersByDept : undefined,
          overtimeHoursPerDay,
        });
        toast.success("Plan saved");
      } catch {
        toast.error("Could not save the plan");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-4 sm:px-6 md:px-8 py-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>OC number</Label>
            <Input value={oc.ocNumber} disabled />
          </div>

          <div className="space-y-2">
            <Label>Plan by</Label>
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="w-full">
                <TabsTrigger value="date" className="flex-1">
                  Dates
                </TabsTrigger>
                <TabsTrigger value="workers" className="flex-1">
                  Workers
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground">
              {mode === "date"
                ? "Pick a date range — the calculator derives workers needed per department."
                : "Set people per department — the calculator derives working days and end date."}
            </p>
          </div>

          <div className="space-y-3 rounded-md border border-border px-3 py-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Overtime</div>
                <div className="text-xs text-muted-foreground">
                  Extra hours beyond the {constants.shiftHours}h shift — raises daily capacity
                </div>
              </div>
              <Switch
                checked={overtimeOn}
                onCheckedChange={(on) => {
                  setOvertimeOn(on);
                  if (on && overtimeHours <= 0) setOvertimeHours(2);
                }}
              />
            </div>
            {overtimeOn && (
              <div className="space-y-1.5">
                <Label htmlFor="ot-hours">OT hours / working day</Label>
                <Input
                  id="ot-hours"
                  type="number"
                  min={0.5}
                  max={maxOvertime}
                  step={0.5}
                  value={overtimeHours}
                  onChange={(e) =>
                    setOvertimeHours(
                      Math.min(maxOvertime, Math.max(0, Number(e.target.value) || 0))
                    )
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Day length {constants.shiftHours + overtimeHoursPerDay}h (
                  {constants.shiftHours}h + {overtimeHoursPerDay}h OT) · capacity ×
                  {constants.shiftHours > 0
                    ? ((constants.shiftHours + overtimeHoursPerDay) / constants.shiftHours).toFixed(2)
                    : "1.00"}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <div className="text-sm font-medium">What-if override</div>
              <div className="text-xs text-muted-foreground">Preview only — never saved to the OC</div>
            </div>
            <Switch checked={overrideOn} onCheckedChange={setOverrideOn} />
          </div>

          <div className="space-y-1.5">
            <Label>Product</Label>
            {overrideOn ? (
              <Select value={overrideProductId} onValueChange={(v) => v && setOverrideProductId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => products.find((p) => p.id === value)?.name ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={`${oc.product.name} (${oc.product.code})`} disabled />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={overrideOn ? overrideQuantity : oc.quantity}
              disabled={!overrideOn}
              onChange={(e) => setOverrideQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Colour</Label>
            {overrideOn ? (
              <Select value={overrideColourId} onValueChange={(v) => v && setOverrideColourId(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue>
                    {(value: string) => colours.find((c) => c.id === value)?.name ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {colours.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input value={oc.colour.name} disabled />
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{mode === "workers" ? "Start date & projected end" : "Date range"}</Label>
            <DateRangePicker
              value={range}
              onChange={(next) => {
                if (mode === "workers") {
                  setRange({ from: next.from, to: range.to });
                } else {
                  setRange(next);
                }
              }}
              workingDayConfig={workingDayConfig}
            />
            {mode === "workers" && (
              <p className="text-xs text-muted-foreground">
                End date updates automatically from assigned workers
                {overtimeOn ? " and overtime" : ""}.
              </p>
            )}
          </div>

          {mode === "workers" && (
            <div className="space-y-3">
              <Label>Workers by department</Label>
              {effectiveDepartments.map((d) => {
                const count = workersByDept[d.id] ?? d.headcount;
                const overHeadcount = count > d.headcount;
                return (
                  <div key={d.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{d.name}</span>
                      <span className="text-xs text-muted-foreground">Pool {d.headcount}</span>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={count}
                      onChange={(e) => setWorkerCount(d.id, Number(e.target.value))}
                    />
                    {overHeadcount && (
                      <p className="text-xs text-[var(--status-warn)]">
                        Above rostered headcount ({d.headcount}) — temps assumed.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canWrite && (
            <div className="space-y-1.5 pt-1">
              <Button className="w-full" onClick={handleSave} disabled={saving || isWhatIf}>
                {saving ? "Saving…" : "Save plan"}
              </Button>
              {isWhatIf && (
                <p className="text-xs text-muted-foreground">
                  Saving uses the OC&apos;s actual product, quantity and colour — turn the override off to save.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <ManpowerResultPanel
          result={result}
          workingDays={workingDays}
          targetDate={range.to}
          earliestEndDate={earliestEndDate}
          onUseEarliestDate={useEarliestDate}
          mode={mode}
          canEditWorkers={mode === "workers"}
          onWorkerChange={setWorkerCount}
        />
      </div>
    </div>
  );
}
