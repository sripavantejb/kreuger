"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { QuotationPreview } from "./quotation-preview";
import { suggestUnitRate } from "@/lib/pricing";
import { createQuotation } from "@/lib/actions";
import { COMPANY } from "@/lib/brand";
import { formatINR } from "@/lib/format";
import { Plus, Trash2 } from "lucide-react";

type Slab = { minQuantity: number; maxQuantity: number | null; discountPercent: number };
type ProductData = {
  id: string;
  name: string;
  code: string;
  baseRate: number;
  description: string;
  hsnCode: string;
  pricingSlabs: Slab[];
};
type Colour = { id: string; name: string; hexCode: string };
type ColourImage = { productId: string; colourId: string; imagePath: string };
type LastQuote = { productId: string; unitRate: number; quotationNumber: string; quantity: number };

type DraftLine = {
  key: string;
  productId: string;
  colourId: string;
  quantity: number;
  unitRate: number;
  rateTouched: boolean;
  location: string;
};

function newKey() {
  return `line-${Math.random().toString(36).slice(2, 9)}`;
}

export function NewQuotationForm({
  products,
  colours,
  colourImages,
  gstPercent,
  lastQuotesByProduct = [],
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
  lastQuotesByProduct?: LastQuote[];
  initialProductId?: string;
  initialColourId?: string;
  initialQuantity?: number;
  initialLocation?: string;
  revisesQuotationNumber?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const defaultProductId = initialProductId ?? products[0]?.id ?? "";
  const defaultColourId = initialColourId ?? colours[0]?.id ?? "";

  const [lines, setLines] = useState<DraftLine[]>(() => [
    {
      key: newKey(),
      productId: defaultProductId,
      colourId: defaultColourId,
      quantity: initialQuantity ?? 100,
      unitRate: 0,
      rateTouched: false,
      location: initialLocation ?? "",
    },
  ]);

  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerState, setCustomerState] = useState("Karnataka");
  const [customerStateCode, setCustomerStateCode] = useState("29");
  const [customerGstin, setCustomerGstin] = useState("");
  const [shipToName, setShipToName] = useState("");
  const [shipToAddress, setShipToAddress] = useState("");
  const [shipToState, setShipToState] = useState("Karnataka");
  const [shipToStateCode, setShipToStateCode] = useState("29");
  const [shipToGstin, setShipToGstin] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [customerRefNo, setCustomerRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Advance 100%");

  const resolvedLines = useMemo(() => {
    return lines.map((line) => {
      const product = products.find((p) => p.id === line.productId) ?? products[0];
      const colour = colours.find((c) => c.id === line.colourId) ?? colours[0];
      const lastQuote = lastQuotesByProduct.find((q) => q.productId === product?.id) ?? null;
      const suggestion = product
        ? suggestUnitRate({
            baseRate: product.baseRate,
            quantity: line.quantity,
            slabs: product.pricingSlabs,
            lastQuotation: lastQuote,
          })
        : null;
      const unitRate = line.rateTouched ? line.unitRate : (suggestion?.suggestedUnitRate ?? 0);
      const imagePath =
        colourImages.find((ci) => ci.productId === product?.id && ci.colourId === colour?.id)?.imagePath ??
        "";
      return { line, product, colour, suggestion, unitRate, imagePath };
    });
  }, [lines, products, colours, colourImages, lastQuotesByProduct]);

  function updateLine(key: string, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [
      ...prev,
      {
        key: newKey(),
        productId: products[0]?.id ?? "",
        colourId: colours[0]?.id ?? "",
        quantity: 1,
        unitRate: 0,
        rateTouched: false,
        location: "",
      },
    ]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  const headerTotal = resolvedLines.reduce((s, r) => s + r.unitRate * r.line.quantity, 0);

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        const id = await createQuotation({
          lines: resolvedLines.map((r) => ({
            productId: r.product!.id,
            colourId: r.colour!.id,
            quantity: r.line.quantity,
            unitRate: r.unitRate,
            location: r.line.location,
          })),
          revisesQuotationNumber,
          vendorName: customerName,
          vendorAddress: customerAddress,
          vendorState: customerState,
          vendorStateCode: customerStateCode,
          vendorGstin: customerGstin,
          shipToName: shipToName || customerName,
          shipToAddress: shipToAddress || customerAddress,
          shipToState: shipToState || customerState,
          shipToStateCode: shipToStateCode || customerStateCode,
          shipToGstin: shipToGstin || customerGstin,
          deliveryDate: deliveryDate || null,
          contactPerson,
          contactPhone,
          contactEmail,
          buyerName,
          vendorRefNo: customerRefNo,
          remarks,
          paymentTerms,
        });
        router.push(`/quotations/${id}`);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save the quotation.");
      }
    });
  }

  if (!products[0] || !colours[0]) {
    return <div className="px-4 py-6 sm:px-6 md:px-8 text-sm text-muted-foreground">No product master data found.</div>;
  }

  const previewData = {
    quotationNumber: "DRAFT",
    date: new Date(),
    productName: resolvedLines[0]?.product?.name ?? "",
    productCode: resolvedLines[0]?.product?.code ?? "",
    description: resolvedLines[0]?.product?.description ?? "",
    hsnCode: resolvedLines[0]?.product?.hsnCode ?? "",
    imagePath: resolvedLines[0]?.imagePath ?? "",
    colourName: resolvedLines[0]?.colour?.name ?? "",
    colourHex: resolvedLines[0]?.colour?.hexCode,
    location: resolvedLines[0]?.line.location ?? "",
    quantity: resolvedLines.reduce((s, r) => s + r.line.quantity, 0),
    unitRate: resolvedLines[0]?.unitRate ?? 0,
    lineTotal: headerTotal,
    gstPercent,
    lines: resolvedLines.map((r) => ({
      productName: r.product!.name,
      productCode: r.product!.code,
      description: r.product!.description,
      hsnCode: r.product!.hsnCode,
      imagePath: r.imagePath,
      colourName: r.colour!.name,
      colourHex: r.colour!.hexCode,
      location: r.line.location,
      quantity: r.line.quantity,
      unitRate: r.unitRate,
      lineTotal: r.unitRate * r.line.quantity,
    })),
    vendorName: customerName,
    vendorAddress: customerAddress,
    vendorState: customerState,
    vendorStateCode: customerStateCode,
    vendorGstin: customerGstin,
    shipToName: shipToName || customerName,
    shipToAddress: shipToAddress || customerAddress,
    shipToState: shipToState || customerState,
    shipToStateCode: shipToStateCode || customerStateCode,
    shipToGstin: shipToGstin || customerGstin,
    deliveryDate: deliveryDate || null,
    contactPerson,
    contactPhone,
    contactEmail,
    buyerName,
    vendorRefNo: customerRefNo,
    remarks,
    paymentTerms,
  };

  return (
    <div className="grid grid-cols-1 gap-8 px-4 py-6 sm:px-6 md:px-8 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Product lines</div>
            <Button type="button" size="sm" variant="outline" onClick={addLine}>
              <Plus className="size-3.5" /> Add product
            </Button>
          </div>

          {resolvedLines.map(({ line, product, suggestion, unitRate }, index) => (
            <div key={line.key} className="space-y-3 rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Line {index + 1}</div>
                {lines.length > 1 && (
                  <Button type="button" size="icon-sm" variant="ghost" onClick={() => removeLine(line.key)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Product</Label>
                <Select
                  value={line.productId}
                  onValueChange={(v) => v && updateLine(line.key, { productId: v, rateTouched: false })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {(value: string) => {
                        const p = products.find((x) => x.id === value);
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) =>
                      updateLine(line.key, {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                        rateTouched: false,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Colour</Label>
                  <Select value={line.colourId} onValueChange={(v) => v && updateLine(line.key, { colourId: v })}>
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
                </div>
              </div>

              {suggestion && (
                <div className="rounded-md bg-secondary/50 p-2 space-y-2">
                  <p className="text-xs text-muted-foreground">{suggestion.explanation}</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <Label className="text-xs">Unit rate (editable)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={unitRate}
                        onChange={(e) =>
                          updateLine(line.key, {
                            unitRate: Math.max(0, Number(e.target.value) || 0),
                            rateTouched: true,
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        updateLine(line.key, {
                          unitRate: suggestion.suggestedUnitRate,
                          rateTouched: false,
                        })
                      }
                    >
                      Use {formatINR(suggestion.suggestedUnitRate)}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Line total: {formatINR(unitRate * line.quantity)}
                    {product ? ` · ${product.name}` : ""}
                  </p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Location (optional)</Label>
                <Input
                  placeholder="e.g. Reception"
                  value={line.location}
                  onChange={(e) => updateLine(line.key, { location: e.target.value })}
                />
              </div>
            </div>
          ))}

          <p className="text-sm text-muted-foreground">
            Quotation total: <span className="font-medium text-foreground">{formatINR(headerTotal)}</span>
          </p>

          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>State code</Label>
                  <Input value={customerStateCode} onChange={(e) => setCustomerStateCode(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>GSTIN</Label>
                <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ship to (defaults to customer)
            </div>
            <div className="space-y-3">
              <Input placeholder={customerName || COMPANY.legalName} value={shipToName} onChange={(e) => setShipToName(e.target.value)} />
              <Textarea rows={2} value={shipToAddress} onChange={(e) => setShipToAddress(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input value={shipToState} onChange={(e) => setShipToState(e.target.value)} />
                <Input value={shipToStateCode} onChange={(e) => setShipToStateCode(e.target.value)} />
              </div>
              <Input value={shipToGstin} onChange={(e) => setShipToGstin(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            <Input placeholder="Contact person" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              <Input placeholder="Buyer" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
            </div>
            <Input type="email" placeholder="Email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            <Input placeholder="Customer / enquiry ref" value={customerRefNo} onChange={(e) => setCustomerRefNo(e.target.value)} />
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            <Textarea rows={2} placeholder="Remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button className="w-full" onClick={handleSave} disabled={pending}>
            {pending ? "Saving…" : "Save quotation"}
          </Button>
        </CardContent>
      </Card>

      <div className="min-w-0">
        <QuotationPreview data={previewData} />
      </div>
    </div>
  );
}
