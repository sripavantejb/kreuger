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
import { computeUnitRate } from "@/lib/pricing";
import { createQuotation } from "@/lib/actions";
import { COMPANY } from "@/lib/brand";

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

  const [vendorName, setVendorName] = useState("Maruthi Enterprises");
  const [vendorAddress, setVendorAddress] = useState("No. 12, Industrial Layout, Peenya, Bengaluru");
  const [vendorState, setVendorState] = useState("Karnataka");
  const [vendorStateCode, setVendorStateCode] = useState("29");
  const [vendorGstin, setVendorGstin] = useState("");
  const [shipToName, setShipToName] = useState<string>(COMPANY.legalName);
  const [shipToAddress, setShipToAddress] = useState(COMPANY.addressLines.join(" "));
  const [shipToState, setShipToState] = useState<string>(COMPANY.state);
  const [shipToStateCode, setShipToStateCode] = useState<string>(COMPANY.stateCode);
  const [shipToGstin, setShipToGstin] = useState<string>(COMPANY.gstin);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [buyerName, setBuyerName] = useState("Procurement");
  const [vendorRefNo, setVendorRefNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Advance 100%");

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
          vendorName,
          vendorAddress,
          vendorState,
          vendorStateCode,
          vendorGstin,
          shipToName,
          shipToAddress,
          shipToState,
          shipToStateCode,
          shipToGstin,
          deliveryDate: deliveryDate || null,
          contactPerson,
          contactPhone,
          contactEmail,
          buyerName,
          vendorRefNo,
          remarks,
          paymentTerms,
        });
        router.push(`/quotations/${id}`);
      } catch {
        setError("Could not save the purchase order. Please try again.");
      }
    });
  }

  if (!product || !colour) {
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
    vendorName,
    vendorAddress,
    vendorState,
    vendorStateCode,
    vendorGstin,
    shipToName,
    shipToAddress,
    shipToState,
    shipToStateCode,
    shipToGstin,
    deliveryDate: deliveryDate || null,
    contactPerson,
    contactPhone,
    contactEmail,
    buyerName,
    vendorRefNo,
    remarks,
    paymentTerms,
  };

  return (
    <div className="grid grid-cols-1 gap-8 px-4 py-6 sm:px-6 md:px-8 lg:grid-cols-[380px_1fr]">
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
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vendor</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="vendorName">Name</Label>
                <Input id="vendorName" value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendorAddress">Address</Label>
                <Textarea id="vendorAddress" rows={2} value={vendorAddress} onChange={(e) => setVendorAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="vendorState">State</Label>
                  <Input id="vendorState" value={vendorState} onChange={(e) => setVendorState(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="vendorStateCode">State code</Label>
                  <Input id="vendorStateCode" value={vendorStateCode} onChange={(e) => setVendorStateCode(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vendorGstin">GSTIN</Label>
                <Input id="vendorGstin" value={vendorGstin} onChange={(e) => setVendorGstin(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ship to</div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="shipToName">Name</Label>
                <Input id="shipToName" value={shipToName} onChange={(e) => setShipToName(e.target.value)} />
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
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Order details</div>
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
              <Label htmlFor="vendorRefNo">Vendor ref no.</Label>
              <Input id="vendorRefNo" value={vendorRefNo} onChange={(e) => setVendorRefNo(e.target.value)} />
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
            {pending ? "Saving…" : "Save purchase order"}
          </Button>
        </CardContent>
      </Card>

      <div className="min-w-0">
        <QuotationPreview data={previewData} />
      </div>
    </div>
  );
}
