import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { QuotationDetailActions } from "@/components/quotations/quotation-detail-actions";
import { toQuotationPreviewData } from "@/lib/quotation-doc-data";

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
        description="Purchase order preview — layout matches the exported PDF."
        help={{
          content: (
            <>
              <p>This matches the exported Purchase Order PDF — rates already include quantity discount slabs from Master Data.</p>
              <p>You can revise, export PDF, or print from the actions above.</p>
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
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 md:px-8">
        {quotation.revisesQuotationNumber && (
          <div className="mb-4 rounded-md border border-border bg-secondary/40 px-4 py-2 text-sm text-muted-foreground">
            This is a revision of {quotation.revisesQuotationNumber}.
          </div>
        )}
        <QuotationPreview data={toQuotationPreviewData(quotation, image?.imagePath ?? "", settings.gstPercent)} />
      </div>
    </div>
  );
}
