"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CapacityPanel } from "./capacity-panel";
import { planCapacity, type PlanningDepartment } from "@/lib/planning";
import { applyProductDepartmentRates, type DepartmentRateOverride } from "@/lib/product-department-rates";
import { createOrder } from "@/lib/actions";

type ProductData = {
  id: string;
  name: string;
  code: string;
  defaultLeadDays: number;
  materials: { materialName: string; unit: string; quantityPerUnit: number }[];
  departmentRates: DepartmentRateOverride[];
};
type Colour = { id: string; name: string };

export function NewOrderForm({
  products,
  colours,
  departments,
  constants,
  suggestedOcNumber,
}: {
  products: ProductData[];
  colours: Colour[];
  departments: PlanningDepartment[];
  constants: { procurementDays: number; rampDays: number; shiftHours: number };
  suggestedOcNumber: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [ocNumber, setOcNumber] = useState(suggestedOcNumber);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(100);
  const [colourId, setColourId] = useState(colours[0]?.id ?? "");
  const [targetDays, setTargetDays] = useState(products[0]?.defaultLeadDays ?? 14);

  function handleProductChange(id: string) {
    setProductId(id);
    const p = products.find((p) => p.id === id);
    if (p) setTargetDays(p.defaultLeadDays);
  }

  const product = products.find((p) => p.id === productId) ?? products[0];
  const colour = colours.find((c) => c.id === colourId) ?? colours[0];

  const effectiveDepartments = useMemo(
    () => applyProductDepartmentRates(departments, product?.departmentRates ?? []),
    [departments, product]
  );

  const result = useMemo(
    () => planCapacity(quantity, targetDays, effectiveDepartments, constants),
    [quantity, targetDays, effectiveDepartments, constants]
  );

  const materials = useMemo(
    () =>
      product
        ? product.materials.map((m) => ({
            materialName: m.materialName,
            unit: m.unit,
            quantity: m.quantityPerUnit * quantity,
          }))
        : [],
    [product, quantity]
  );

  function handleRelease() {
    if (!product || !colour) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await createOrder({
          productId: product.id,
          quantity,
          colourId: colour.id,
          targetDays,
          ocNumber,
        });
        router.push(`/orders/${id}`);
      } catch {
        setError("Could not release the order. Please try again.");
      }
    });
  }

  if (!product || !colour) {
    return <div className="px-8 py-6 text-sm text-muted-foreground">No product master data found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-8 py-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="ocNumber">OC number</Label>
            <Input id="ocNumber" value={ocNumber} onChange={(e) => setOcNumber(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="product">Product</Label>
            <Select value={productId} onValueChange={(v) => v && handleProductChange(v)}>
              <SelectTrigger id="product" className="w-full">
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
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="colour">Colour</Label>
            <Select value={colourId} onValueChange={(v) => v && setColourId(v)}>
              <SelectTrigger id="colour" className="w-full">
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
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="targetDays">Target timeline (days)</Label>
            <Input
              id="targetDays"
              type="number"
              min={1}
              value={targetDays}
              onChange={(e) => setTargetDays(Math.max(1, Number(e.target.value) || 1))}
            />
            <p className="text-xs text-muted-foreground">
              Default for {product.name} is {product.defaultLeadDays} days — set in Master Data.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            onClick={handleRelease}
            disabled={pending || result.status !== "ok" || !ocNumber.trim()}
          >
            {pending ? "Releasing…" : "Confirm and release"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <CapacityPanel result={result} targetDays={targetDays} materials={materials} />
      </div>
    </div>
  );
}
