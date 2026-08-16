import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { QuotationPreview } from "@/components/quotations/quotation-preview";
import { PrintButton } from "@/components/quotations/print-button";

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  MASTRO: "Ergonomic visitor chair with a moulded shell, fabricated steel frame and powder-coated finish.",
};

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
    <div className="mx-auto max-w-2xl px-4 sm:px-6 md:px-8 py-10">
      <div className="no-print mb-4 flex justify-end">
        <PrintButton />
      </div>
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
          gstPercent: settings.gstPercent,
        }}
      />
    </div>
  );
}
