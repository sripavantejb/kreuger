"use client";

import { useMemo, useState } from "react";
import { addDays } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Material = { materialName: string; unit: string; quantityPerUnit: number };
type ProductOption = { id: string; name: string; code: string; materials: Material[] };

export function ManpowerCustomClient({
  products,
  departments,
  constants,
  workingDayConfig,
}: {
  products: ProductOption[];
  departments: ManpowerDepartment[];
  constants: ManpowerConstants;
  workingDayConfig: WorkingDayConfig;
}) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const today = useMemo(() => new Date(), []);
  const [range, setRange] = useState<DateRange>({ from: today, to: addDays(today, 14) });

  const product = products.find((p) => p.id === productId) ?? products[0];

  const workingDays = useMemo(
    () => workingDaysBetween(range.from, range.to, workingDayConfig),
    [range, workingDayConfig]
  );

  const result = useMemo(
    () => planManpower(quantity, workingDays, departments, constants, product?.materials ?? []),
    [quantity, workingDays, departments, constants, product]
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

  if (!product) {
    return <div className="px-8 py-6 text-sm text-muted-foreground">No product master data found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {(value: string) => {
                    const p = products.find((p) => p.id === value);
                    return p ? `${p.name} (${p.code})` : "";
                  }}
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
          </div>

          <div className="space-y-1.5">
            <Label>Quantity</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Date range</Label>
            <DateRangePicker value={range} onChange={setRange} workingDayConfig={workingDayConfig} />
          </div>

          <p className="text-xs text-muted-foreground">
            Exploratory only — not tied to an order confirmation, nothing is saved. To commit this
            timeline, create an OC from Orders and its plan will appear here automatically.
          </p>
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
