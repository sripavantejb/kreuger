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
import { QuotationPreview } from "./quotation-preview";
import { computeUnitRate } from "@/lib/pricing";
import { createQuotation } from "@/lib/actions";

type Slab = { minQuantity: number; maxQuantity: number | null; discountPercent: number };
type ProductData = {
  id: string;
  name: string;
  code: string;
  baseRate: number;
  description: string;
  pricingSlabs: Slab[];
};
type Colour = { id: string; name: string; hexCode: string };
type ColourImage = { productId: string; colourId: string; imagePath: string };

export function NewQuotationForm({
  products,
  colours,
  colourImages,
  gstPercent,
  initialProductId,
  initialColourId,
  initialQuantity,
  initialLocation,
  revisesQuotationNumber,
}: {
  products: ProductData[];
  colours: Colour[];
  colourImages: ColourImage[];
  gstPercent: number;
  initialProductId?: string;
  initialColourId?: string;
  initialQuantity?: number;
  initialLocation?: string;
  revisesQuotationNumber?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(initialQuantity ?? 100);
  const [colourId, setColourId] = useState(initialColourId ?? colours[0]?.id ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");

  const product = products.find((p) => p.id === productId) ?? products[0];
  const colour = colours.find((c) => c.id === colourId) ?? colours[0];
  const imagePath =
    colourImages.find((ci) => ci.productId === product?.id && ci.colourId === colour?.id)
      ?.imagePath ?? "";

  const unitRate = useMemo(
    () => (product ? computeUnitRate(product.baseRate, quantity, product.pricingSlabs) : 0),
    [product, quantity]
  );
  const lineTotal = unitRate * quantity;

  function handleSave() {
    if (!product || !colour) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await createQuotation({
          productId: product.id,
          quantity,
          colourId: colour.id,
          location,
          revisesQuotationNumber,
        });
        router.push(`/quotations/${id}`);
      } catch {
        setError("Could not save the quotation. Please try again.");
      }
    });
  }

  if (!product || !colour) {
    return <div className="px-4 sm:px-6 md:px-8 py-6 text-sm text-muted-foreground">No product master data found.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-8 px-4 sm:px-6 md:px-8 py-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="product">Product</Label>
            <Select value={productId} onValueChange={(v) => v && setProductId(v)}>
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
            <Label htmlFor="location">Location (optional)</Label>
            <Input
              id="location"
              placeholder="e.g. Reception, Workstations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Where these units go on site — shown on the PDF.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save & export"}
          </Button>
        </CardContent>
      </Card>

      <div>
        <QuotationPreview
          data={{
            quotationNumber: "DRAFT",
            date: new Date(),
            productName: product.name,
            productCode: product.code,
            description: product.description,
            imagePath,
            colourName: colour.name,
            colourHex: colour.hexCode,
            location,
            quantity,
            unitRate,
            lineTotal,
            gstPercent,
          }}
        />
      </div>
    </div>
  );
}
