import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { BrandLogo } from "@/components/layout/brand-logo";
import { COMPANY } from "@/lib/brand";
import { amountInWordsINR } from "@/lib/amount-in-words";

export type QuotationPreviewData = {
  quotationNumber: string;
  date: Date | string;
  productName: string;
  productCode: string;
  description: string;
  hsnCode?: string;
  imagePath: string;
  colourName: string;
  colourHex?: string;
  location?: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  gstPercent: number;
  discountPercent?: number;
  vendorName?: string;
  vendorAddress?: string;
  vendorState?: string;
  vendorStateCode?: string;
  vendorGstin?: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToState?: string;
  shipToStateCode?: string;
  shipToGstin?: string;
  deliveryDate?: Date | string | null;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  buyerName?: string;
  vendorRefNo?: string;
  remarks?: string;
  paymentTerms?: string;
};

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-[42%_58%] gap-x-1 text-[11px] sm:text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">: {value?.trim() || "—"}</span>
    </div>
  );
}

function PartyBox({
  title,
  name,
  address,
  state,
  stateCode,
  gstin,
}: {
  title: string;
  name?: string;
  address?: string;
  state?: string;
  stateCode?: string;
  gstin?: string;
}) {
  return (
    <div className="min-w-0 flex-1 border border-foreground/80">
      <div className="border-b border-foreground/80 bg-secondary px-3 py-1.5 text-xs font-semibold">{title}</div>
      <div className="space-y-1 px-3 py-2.5 text-xs">
        <div className="font-semibold">{name?.trim() || "—"}</div>
        <div className="text-muted-foreground whitespace-pre-wrap">{address?.trim() || "—"}</div>
        <div>
          State: {state?.trim() || "—"} | Code: {stateCode?.trim() || "—"}
        </div>
        <div>GST No.: {gstin?.trim() || "—"}</div>
      </div>
    </div>
  );
}

export function QuotationPreview({ data }: { data: QuotationPreviewData }) {
  const specs = data.description.split("\n").map((s) => s.trim()).filter(Boolean);
  const discountPct = data.discountPercent ?? 0;
  const taxable = data.lineTotal * (1 - discountPct / 100);
  const cgstRate = data.gstPercent / 2;
  const sgstRate = data.gstPercent / 2;
  const cgstAmt = (taxable * cgstRate) / 100;
  const sgstAmt = (taxable * sgstRate) / 100;
  const totalGst = cgstAmt + sgstAmt;
  const grandTotalRaw = taxable + totalGst;
  const grandTotal = Math.round(grandTotalRaw);
  const rounding = grandTotal - grandTotalRaw;
  const poDate = typeof data.date === "string" ? data.date : formatDate(data.date);
  const delivery =
    data.deliveryDate == null || data.deliveryDate === ""
      ? "—"
      : typeof data.deliveryDate === "string"
        ? formatDate(data.deliveryDate)
        : formatDate(data.deliveryDate);

  return (
    <div className="overflow-hidden border border-foreground/80 bg-card text-foreground shadow-airbnb">
      {/* Letterhead */}
      <div className="border-b border-foreground/80 px-4 py-5 text-center sm:px-6">
        <div className="mb-2 flex items-center justify-center gap-2.5">
          <BrandLogo size="md" className="shrink-0" />
          <div className="text-base font-bold tracking-tight sm:text-lg">{COMPANY.legalName}</div>
        </div>
        {COMPANY.addressLines.map((line) => (
          <div key={line} className="text-[11px] text-muted-foreground sm:text-xs">
            {line}
          </div>
        ))}
        <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
          Email: {COMPANY.email} | Phone: {COMPANY.phone}
        </div>
        <div className="text-[11px] text-muted-foreground sm:text-xs">
          PAN: {COMPANY.pan} | GSTIN: {COMPANY.gstin} | CIN: {COMPANY.cin}
        </div>
      </div>

      <div className="border-b border-foreground/80 py-2 text-center text-sm font-bold tracking-widest">
        PURCHASE ORDER
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 border-b border-foreground/80 sm:grid-cols-2">
        <div className="space-y-1 border-b border-foreground/80 p-3 sm:border-b-0 sm:border-r">
          <Meta label="PO No." value={data.quotationNumber} />
          <Meta label="PO Date" value={poDate} />
          <Meta label="State" value={COMPANY.state} />
          <Meta label="State Code" value={COMPANY.stateCode} />
          <Meta label="Place of Supply" value={data.shipToState || COMPANY.state} />
        </div>
        <div className="space-y-1 p-3">
          <Meta label="Document Date" value={poDate} />
          <Meta label="Delivery Date" value={delivery} />
          <Meta label="Contact Person" value={data.contactPerson} />
          <Meta label="Phone No." value={data.contactPhone} />
          <Meta label="Email" value={data.contactEmail} />
          <Meta label="Buyer" value={data.buyerName} />
          <Meta label="Vendor Ref No." value={data.vendorRefNo} />
        </div>
      </div>

      {/* Parties */}
      <div className="flex flex-col sm:flex-row">
        <PartyBox
          title="Details of Vendor"
          name={data.vendorName}
          address={data.vendorAddress}
          state={data.vendorState}
          stateCode={data.vendorStateCode}
          gstin={data.vendorGstin}
        />
        <PartyBox
          title="Ship To Details"
          name={data.shipToName}
          address={data.shipToAddress}
          state={data.shipToState}
          stateCode={data.shipToStateCode}
          gstin={data.shipToGstin}
        />
      </div>

      {/* Line table */}
      <div className="overflow-x-auto border-t border-foreground/80">
        <table className="w-full min-w-[720px] border-collapse text-[10px] sm:text-[11px]">
          <thead>
            <tr className="bg-secondary text-center font-semibold">
              <th className="border border-foreground/40 px-1 py-1.5">Sr.</th>
              <th className="border border-foreground/40 px-1 py-1.5 text-left">Description</th>
              <th className="border border-foreground/40 px-1 py-1.5">HSN/SAC</th>
              <th className="border border-foreground/40 px-1 py-1.5">Qty</th>
              <th className="border border-foreground/40 px-1 py-1.5">UOM</th>
              <th className="border border-foreground/40 px-1 py-1.5">Rate</th>
              <th className="border border-foreground/40 px-1 py-1.5">Disc %</th>
              <th className="border border-foreground/40 px-1 py-1.5">Taxable</th>
              <th className="border border-foreground/40 px-1 py-1.5">CGST %</th>
              <th className="border border-foreground/40 px-1 py-1.5">CGST Amt</th>
              <th className="border border-foreground/40 px-1 py-1.5">SGST %</th>
              <th className="border border-foreground/40 px-1 py-1.5">SGST Amt</th>
              <th className="border border-foreground/40 px-1 py-1.5">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="align-top">
              <td className="border border-foreground/40 px-1 py-2 text-center">1</td>
              <td className="border border-foreground/40 px-2 py-2">
                <div className="font-semibold">{data.productName}</div>
                {data.location && <div className="text-muted-foreground">Location: {data.location}</div>}
                <div className="text-muted-foreground">Colour: {data.colourName}</div>
                {specs.slice(0, 3).map((s, i) => (
                  <div key={i} className="text-muted-foreground">
                    • {s}
                  </div>
                ))}
                {data.imagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.imagePath} alt="" className="mt-2 size-12 object-cover" />
                ) : null}
              </td>
              <td className="border border-foreground/40 px-1 py-2 text-center">{data.hsnCode || "—"}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{formatNumber(data.quantity)}</td>
              <td className="border border-foreground/40 px-1 py-2 text-center">Nos</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{formatINR(data.unitRate)}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{discountPct}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{formatINR(taxable)}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{cgstRate}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{formatINR(cgstAmt)}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{sgstRate}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right tabular-nums">{formatINR(sgstAmt)}</td>
              <td className="border border-foreground/40 px-1 py-2 text-right font-semibold tabular-nums">
                {formatINR(taxable + totalGst)}
              </td>
            </tr>
            <tr className="bg-secondary/60 font-semibold">
              <td className="border border-foreground/40 px-2 py-1.5" colSpan={3}>
                Total
              </td>
              <td className="border border-foreground/40 px-1 py-1.5 text-right tabular-nums">{formatNumber(data.quantity)}</td>
              <td className="border border-foreground/40 px-1 py-1.5" colSpan={3} />
              <td className="border border-foreground/40 px-1 py-1.5 text-right tabular-nums">{formatINR(taxable)}</td>
              <td className="border border-foreground/40 px-1 py-1.5" />
              <td className="border border-foreground/40 px-1 py-1.5 text-right tabular-nums">{formatINR(cgstAmt)}</td>
              <td className="border border-foreground/40 px-1 py-1.5" />
              <td className="border border-foreground/40 px-1 py-1.5 text-right tabular-nums">{formatINR(sgstAmt)}</td>
              <td className="border border-foreground/40 px-1 py-1.5 text-right tabular-nums">{formatINR(taxable + totalGst)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom summary */}
      <div className="grid grid-cols-1 gap-0 border-t border-foreground/80 sm:grid-cols-[58%_42%]">
        <div className="space-y-3 border-b border-foreground/80 p-4 text-xs sm:border-b-0 sm:border-r">
          <div>
            <div className="font-semibold">Remarks</div>
            <div className="text-muted-foreground">{data.remarks?.trim() || "—"}</div>
          </div>
          <div>
            <div className="font-semibold">Amount In Words</div>
            <div className="text-muted-foreground">{amountInWordsINR(grandTotal)}</div>
          </div>
          <div>
            <div className="font-semibold">Payment Terms</div>
            <div className="text-muted-foreground">{data.paymentTerms?.trim() || "—"}</div>
          </div>
        </div>
        <div className="text-xs">
          {[
            ["Total Amount Before Tax", formatINR(taxable)],
            [`Add: CGST (${cgstRate}%)`, formatINR(cgstAmt)],
            [`Add: SGST (${sgstRate}%)`, formatINR(sgstAmt)],
            ["Total GST", formatINR(totalGst)],
            ["Rounding", formatINR(rounding)],
            ["Total Amount", formatINR(grandTotal)],
          ].map(([label, value], i, arr) => (
            <div
              key={label}
              className={`flex items-center justify-between border-b border-border px-3 py-2 ${
                i === 3 || i === arr.length - 1 ? "bg-secondary font-semibold" : ""
              } ${i === arr.length - 1 ? "border-b-0" : ""}`}
            >
              <span>{label}</span>
              <span className="tabular-nums">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-6 border-t border-foreground/80 px-4 py-6 text-xs sm:flex-row sm:px-6">
        <div className="space-y-3">
          <div>Prepared by: ________________</div>
          <div>Checked By & Date: ________________</div>
        </div>
        <div className="text-right">
          <div>For, {COMPANY.legalName}</div>
          <div className="mt-10 border-t border-foreground/60 pt-1 inline-block min-w-[140px] text-center">
            Authorised Signatory
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground sm:px-6">
        {COMPANY.registeredOffice} · Page 1 of 1
      </div>
    </div>
  );
}
