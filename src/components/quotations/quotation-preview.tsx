import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { BrandLogo } from "@/components/layout/brand-logo";

export type QuotationPreviewData = {
  quotationNumber: string;
  date: Date | string;
  productName: string;
  productCode: string;
  description: string;
  imagePath: string;
  colourName: string;
  colourHex?: string;
  location?: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
  gstPercent: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export function QuotationPreview({ data }: { data: QuotationPreviewData }) {
  const specs = data.description.split("\n").map((s) => s.trim()).filter(Boolean);
  const gstAmount = (data.lineTotal * data.gstPercent) / 100;
  const grandTotal = data.lineTotal + gstAmount;

  return (
    <div className="border border-border bg-card">
      <div className="flex flex-col gap-4 border-b border-border px-4 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-6 md:px-8">
        <div className="flex items-start gap-3">
          <BrandLogo size="lg" className="shrink-0" />
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quotation</div>
            <div className="mt-1 text-xl font-semibold tracking-tight">{data.quotationNumber}</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground sm:text-right">
          <div className="font-medium text-foreground">Kreuger Furniture Works</div>
          <div>{formatDate(data.date)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 px-4 sm:px-6 md:px-8 py-8 sm:grid-cols-[220px_1fr]">
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-md border border-border bg-secondary">
          {data.imagePath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imagePath} alt={`${data.productName} — ${data.colourName}`} className="h-full w-full object-cover" />
          ) : (
            <div
              className="flex size-24 items-center justify-center rounded-full text-lg font-semibold text-white"
              style={{ backgroundColor: data.colourHex ?? "#78716c" }}
            >
              {initials(data.productName)}
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between">
          <div>
            <div className="text-lg font-semibold">{data.productName}</div>
            <div className="text-sm text-muted-foreground">Code: {data.productCode}</div>
            {specs.length > 0 && (
              <ul className="mt-2 max-w-md list-disc space-y-0.5 pl-4 text-sm text-foreground/80">
                {specs.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-muted-foreground">Colour:</span>{" "}
                <span className="font-medium">{data.colourName}</span>
              </div>
              {data.location && (
                <div>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  <span className="font-medium">{data.location}</span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[280px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 font-medium">Quantity</th>
                  <th className="py-2 font-medium">Unit rate</th>
                  <th className="py-2 text-right font-medium">Line total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-3 tabular-nums">{formatNumber(data.quantity)} units</td>
                  <td className="py-3 tabular-nums">{formatINR(data.unitRate)}</td>
                  <td className="py-3 text-right tabular-nums font-semibold">{formatINR(data.lineTotal)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr className="border-t border-border text-muted-foreground">
                  <td colSpan={2} className="py-1.5 text-right">Total</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(data.lineTotal)}</td>
                </tr>
                <tr className="text-muted-foreground">
                  <td colSpan={2} className="py-1.5 text-right">GST ({data.gstPercent}%)</td>
                  <td className="py-1.5 text-right tabular-nums">{formatINR(gstAmount)}</td>
                </tr>
                <tr className="border-t border-border font-semibold">
                  <td colSpan={2} className="py-2 text-right">Grand Total</td>
                  <td className="py-2 text-right tabular-nums">{formatINR(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-4 sm:px-6 md:px-8 py-4 text-xs text-muted-foreground">
        Prices in INR. GST applied as shown above. Valid for 30 days from the date of issue.
      </div>
    </div>
  );
}
