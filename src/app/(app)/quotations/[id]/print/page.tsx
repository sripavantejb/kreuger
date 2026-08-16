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
      include: { product: true, colour: true },
    }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!quotation) notFound();

  const image = await prisma.productColourImage.findFirst({
    where: { productId: quotation.productId, colourId: quotation.colourId },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 md:px-8">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
      <QuotationPreview data={toQuotationPreviewData(quotation, image?.imagePath ?? "", settings.gstPercent)} />
    </div>
  );
}
