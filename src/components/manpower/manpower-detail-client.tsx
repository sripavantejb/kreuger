"use client";

import { useMemo, useState, useTransition } from "react";
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
import { DateRangePicker, type DateRange } from "./date-range-picker";
import { ManpowerResultPanel } from "./manpower-result-panel";
import { planManpower, type ManpowerDepartment, type ManpowerConstants } from "@/lib/manpower";
import { workingDaysBetween, addWorkingDays, type WorkingDayConfig } from "@/lib/working-days";
import { saveManpowerPlan } from "@/lib/actions-manpower";

type Material = { materialName: string; unit: string; quantityPerUnit: number };
type ProductOption = { id: string; name: string; code: string; materials: Material[] };
type ColourOption = { id: string; name: string };

export function ManpowerDetailClient({
  oc,
  products,
  colours,
  departments,
  constants,
  workingDayConfig,
  initialRange,
  canWrite,
}: {
  oc: { id: string; ocNumber: string; quantity: number; product: ProductOption; colour: ColourOption };
  products: ProductOption[];
  colours: ColourOption[];
  departments: ManpowerDepartment[];
  constants: ManpowerConstants;
  workingDayConfig: WorkingDayConfig;
  initialRange: DateRange;
  canWrite: boolean;
}) {
  const [range, setRange] = useState<DateRange>(initialRange);
  const [overrideOn, setOverrideOn] = useState(false);
  const [overrideProductId, setOverrideProductId] = useState(oc.product.id);
  const [overrideQuantity, setOverrideQuantity] = useState(oc.quantity);
  const [overrideColourId, setOverrideColourId] = useState(oc.colour.id);
  const [saving, startSaving] = useTransition();

  const effectiveProduct = overrideOn
    ? products.find((p) => p.id === overrideProductId) ?? oc.product
    : oc.product;
  const effectiveQuantity = overrideOn ? overrideQuantity : oc.quantity;
  const isWhatIf =
    overrideOn &&
    (overrideProductId !== oc.product.id ||
      overrideQuantity !== oc.quantity ||
      overrideColourId !== oc.colour.id);

  const workingDays = useMemo(
    () => workingDaysBetween(range.from, range.to, workingDayConfig),
    [range, workingDayConfig]
  );

  const result = useMemo(
    () => planManpower(effectiveQuantity, workingDays, departments, constants, effectiveProduct.materials),
    [effectiveQuantity, workingDays, departments, constants, effectiveProduct]
  );

  const earliestEndDate = useMemo(() => {
    if (result.status === "blocked" && result.earliestWorkingDays !== null) {
      return addWorkingDays(range.from, result.earliestWorkingDays, workingDayConfig);
    }
    return null;
  }, [result, range.from, workingDayConfig]);

  function useEarliestDate() {
    if (earliestEndDate) setRange({ from: range.from, to: earliestEndDate });
  }

  function handleSave() {
    startSaving(async () => {
      try {
        await saveManpowerPlan({ ocId: oc.id, startDate: range.from, endDate: range.to });
        toast.success("Plan saved");
      } catch {
        toast.error("Could not save the plan");
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>OC number</Label>
            <Input value={oc.ocNumber} disabled />
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
            <Label>Date range</Label>
            <DateRangePicker value={range} onChange={setRange} workingDayConfig={workingDayConfig} />
          </div>

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
        />
      </div>
    </div>
  );
}
