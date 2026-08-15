import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { QuotationDetailActions } from "@/components/quotations/quotation-detail-actions";

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  MASTRO: "Ergonomic visitor chair with a moulded shell, fabricated steel frame and powder-coated finish.",
};

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, session] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { product: true, colour: true },
    }),
    getSession(),
  ]);
  if (!quotation) notFound();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const image = await prisma.productColourImage.findFirst({
    where: { productId: quotation.productId, colourId: quotation.colourId },
  });

  return (
    <div>
      <PageHeader
        title={quotation.quotationNumber}
        description="Quotation preview — layout matches the exported PDF."
        actions={
          <QuotationDetailActions
            quotationId={quotation.id}
            quotationNumber={quotation.quotationNumber}
            productId={quotation.productId}
            colourId={quotation.colourId}
            quantity={quotation.quantity}
            canWrite={canWrite}
          />
        }
      />
      <div className="px-8 py-6 max-w-2xl">
        {quotation.revisesQuotationNumber && (
          <div className="mb-4 rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm text-muted-foreground">
            This is a revision of {quotation.revisesQuotationNumber}.
          </div>
        )}
        <QuotationPreview
          data={{
            quotationNumber: quotation.quotationNumber,
            date: quotation.createdAt,
            productName: quotation.product.name,
            productCode: quotation.product.code,
            description: PRODUCT_DESCRIPTIONS[quotation.product.code] ?? "",
            imagePath: image?.imagePath ?? "",
            colourName: quotation.colour.name,
            colourHex: quotation.colour.hexCode,
            quantity: quotation.quantity,
            unitRate: quotation.unitRate,
            lineTotal: quotation.lineTotal,
          }}
        />
      </div>
    </div>
  );
}
