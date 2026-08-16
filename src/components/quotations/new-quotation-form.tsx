"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
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

  const [productId, setProductId] = useState(initialProductId ?? products[0]?.id ?? "");
  const [quantity, setQuantity] = useState(initialQuantity ?? 100);
  const [colourId, setColourId] = useState(initialColourId ?? colours[0]?.id ?? "");
  const [location, setLocation] = useState(initialLocation ?? "");

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

  const product = products.find((p) => p.id === productId) ?? products[0];
  const colour = colours.find((c) => c.id === colourId) ?? colours[0];
  const imagePath =
    colourImages.find((ci) => ci.productId === product?.id && ci.colourId === colour?.id)
      ?.imagePath ?? "";

  const lastQuote = lastQuotesByProduct.find((q) => q.productId === product?.id) ?? null;

  const suggestion = useMemo(
    () =>
      product
        ? suggestUnitRate({
            baseRate: product.baseRate,
            quantity,
            slabs: product.pricingSlabs,
            lastQuotation: lastQuote,
          })
        : null,
    [product, quantity, lastQuote]
  );

  const [unitRate, setUnitRate] = useState(suggestion?.suggestedUnitRate ?? 0);
  const [rateTouched, setRateTouched] = useState(false);

  useEffect(() => {
    if (!rateTouched && suggestion) {
      setUnitRate(suggestion.suggestedUnitRate);
    }
  }, [suggestion, rateTouched]);

  useEffect(() => {
    setRateTouched(false);
  }, [productId, quantity]);

  const lineTotal = unitRate * quantity;

  function applySuggested() {
    if (!suggestion) return;
    setUnitRate(suggestion.suggestedUnitRate);
    setRateTouched(false);
  }

  function handleSave() {
    if (!product || !colour) return;
    setError(null);
    startTransition(async () => {
      try {
        const id = await createQuotation({
          productId: product.id,
          quantity,
          colourId: colour.id,
          unitRate,
          location,
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
      } catch {
        setError("Could not save the quotation. Please try again.");
      }
    });
  }

  if (!product || !colour || !suggestion) {
    return <div className="px-4 py-6 sm:px-6 md:px-8 text-sm text-muted-foreground">No product master data found.</div>;
  }

  const previewData = {
    quotationNumber: "DRAFT",
    date: new Date(),
    productName: product.name,
    productCode: product.code,
    description: product.description,
    hsnCode: product.hsnCode,
    imagePath,
    colourName: colour.name,
    colourHex: colour.hexCode,
    location,
    quantity,
    unitRate,
    lineTotal,
    gstPercent,
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
    <div className="grid grid-cols-1 gap-8 px-4 py-6 sm:px-6 md:px-8 lg:grid-cols-[400px_1fr]">
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

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested price
            </div>
            <p className="text-sm text-muted-foreground">{suggestion.explanation}</p>
            <p className="text-xs text-muted-foreground">{suggestion.slabLabel}</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <Label htmlFor="unitRate">Unit rate (INR) — editable</Label>
                <Input
                  id="unitRate"
                  type="number"
                  min={0}
                  step={0.01}
                  value={unitRate}
                  onChange={(e) => {
                    setRateTouched(true);
                    setUnitRate(Math.max(0, Number(e.target.value) || 0));
                  }}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={applySuggested}>
                Use suggested {formatINR(suggestion.suggestedUnitRate)}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Line total: <span className="font-medium text-foreground">{formatINR(lineTotal)}</span>
              {" · "}
              Suggested never overrides a manager-approved rate silently.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="location">Line location (optional)</Label>
            <Input
              id="location"
              placeholder="e.g. Reception, Workstations"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Customer</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Name</Label>
                <Input id="customerName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerAddress">Address</Label>
                <Textarea id="customerAddress" rows={2} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="customerState">State</Label>
                  <Input id="customerState" value={customerState} onChange={(e) => setCustomerState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="customerStateCode">State code</Label>
                  <Input id="customerStateCode" value={customerStateCode} onChange={(e) => setCustomerStateCode(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerGstin">GSTIN</Label>
                <Input id="customerGstin" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ship to (defaults to customer)
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="shipToName">Name</Label>
                <Input id="shipToName" placeholder={customerName || COMPANY.legalName} value={shipToName} onChange={(e) => setShipToName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipToAddress">Address</Label>
                <Textarea id="shipToAddress" rows={2} value={shipToAddress} onChange={(e) => setShipToAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="shipToState">State</Label>
                  <Input id="shipToState" value={shipToState} onChange={(e) => setShipToState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shipToStateCode">State code</Label>
                  <Input id="shipToStateCode" value={shipToStateCode} onChange={(e) => setShipToStateCode(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shipToGstin">GSTIN</Label>
                <Input id="shipToGstin" value={shipToGstin} onChange={(e) => setShipToGstin(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quote details</div>
            <div className="space-y-1.5">
              <Label htmlFor="deliveryDate">Delivery date</Label>
              <Input id="deliveryDate" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactPerson">Contact person</Label>
              <Input id="contactPerson" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone">Phone</Label>
                <Input id="contactPhone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="buyerName">Buyer</Label>
                <Input id="buyerName" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="customerRefNo">Customer / enquiry ref</Label>
              <Input id="customerRefNo" value={customerRefNo} onChange={(e) => setCustomerRefNo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentTerms">Payment terms</Label>
              <Input id="paymentTerms" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>
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
