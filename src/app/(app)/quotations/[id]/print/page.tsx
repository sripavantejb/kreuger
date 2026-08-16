import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { PrintButton } from "@/components/quotations/print-button";
import { toQuotationPreviewData } from "@/lib/quotation-doc-data";

export const dynamic = "force-dynamic";

export default async function QuotationPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, settings] = await Promise.all([
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
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!quotation) notFound();

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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <QuotationPreview
        data={toQuotationPreviewData(withImages, imageFor(quotation.productId, quotation.colourId), settings.gstPercent)}
      />
    </div>
  );
}
