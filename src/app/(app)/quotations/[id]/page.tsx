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
      include: {
        product: true,
        colour: true,
        lines: {
          include: { product: true, colour: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    getSession(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!quotation) notFound();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const lineImages = await prisma.productColourImage.findMany({
    where: {
      OR:
        quotation.lines.length > 0
          ? quotation.lines.map((l) => ({ productId: l.productId, colourId: l.colourId }))
          : [{ productId: quotation.productId, colourId: quotation.colourId }],
    },
  });
  const imageFor = (productId: string, colourId: string) =>
    lineImages.find((i) => i.productId === productId && i.colourId === colourId)?.imagePath ?? "";

  const withImages = {
    ...quotation,
    lines:
      quotation.lines.length > 0
        ? quotation.lines.map((l) => ({
            ...l,
            imagePath: imageFor(l.productId, l.colourId),
          }))
        : undefined,
  };

  const fallbackImage = imageFor(quotation.productId, quotation.colourId);
  const lineCount = quotation.lines.length || 1;

  return (
    <div>
      <PageHeader
        title={quotation.quotationNumber}
        description={`Customer quotation · ${lineCount} product line${lineCount === 1 ? "" : "s"} — layout matches the exported PDF.`}
        help={{
          content: (
            <>
              <p>Confirm as sales order creates one SO per product line for coordinator verification.</p>
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
        <QuotationPreview data={toQuotationPreviewData(withImages, fallbackImage, settings.gstPercent)} />
      </div>
    </div>
  );
}
