import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { QuotationDetailActions } from "@/components/quotations/quotation-detail-actions";

export const dynamic = "force-dynamic";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, session, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { product: true, colour: true },
    }),
    getSession(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
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
        help={{
          content: (
            <>
              <p>This is exactly what the exported PDF looks like — the unit rate already reflects the quantity discount slab from Master Data.</p>
              <p>From here you can revise (create a new quotation number superseding this one), duplicate (start a fresh quotation pre-filled from this), or export the PDF to send to the customer.</p>
            </>
          ),
        }}
        actions={
          <QuotationDetailActions
            quotationId={quotation.id}
            quotationNumber={quotation.quotationNumber}
            productId={quotation.productId}
            colourId={quotation.colourId}
            quantity={quotation.quantity}
            location={quotation.location}
            canWrite={canWrite}
          />
        }
      />
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-2xl">
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
            description: quotation.product.description,
            imagePath: image?.imagePath ?? "",
            colourName: quotation.colour.name,
            colourHex: quotation.colour.hexCode,
            location: quotation.location,
            quantity: quotation.quantity,
            unitRate: quotation.unitRate,
            lineTotal: quotation.lineTotal,
            gstPercent: settings.gstPercent,
          }}
        />
      </div>
    </div>
  );
}
