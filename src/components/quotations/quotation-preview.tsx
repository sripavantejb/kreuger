import { formatDate, formatINR, formatNumber } from "@/lib/format";

export type QuotationPreviewData = {
  quotationNumber: string;
  date: Date | string;
  productName: string;
  productCode: string;
  description: string;
  imagePath: string;
  colourName: string;
  colourHex?: string;
  quantity: number;
  unitRate: number;
  lineTotal: number;
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export function QuotationPreview({ data }: { data: QuotationPreviewData }) {
  return (
    <div className="border border-border bg-card">
      <div className="flex items-start justify-between border-b border-border px-8 py-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Quotation</div>
          <div className="mt-1 text-xl font-semibold tracking-tight">{data.quotationNumber}</div>
        </div>
        <div className="text-right text-sm text-muted-foreground">
          <div>Kreuger Furniture Works</div>
          <div>{formatDate(data.date)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 px-8 py-8 sm:grid-cols-[220px_1fr]">
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
            <p className="mt-2 max-w-md text-sm text-foreground/80">{data.description}</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Colour:</span>
              <span className="font-medium">{data.colourName}</span>
            </div>
          </div>

          <table className="mt-6 w-full text-sm">
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
          </table>
        </div>
      </div>

      <div className="border-t border-border px-8 py-4 text-xs text-muted-foreground">
        Prices in INR, exclusive of taxes. Valid for 30 days from the date of issue.
      </div>
    </div>
  );
}
