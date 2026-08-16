import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotationDocument } from "@/lib/pdf/quotation-document";
import { toQuotationPdfData } from "@/lib/quotation-doc-data";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [quotation, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { product: true, colour: true },
    }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!quotation) {
    return NextResponse.json({ error: "Purchase order not found" }, { status: 404 });
  }
  const image = await prisma.productColourImage.findFirst({
    where: { productId: quotation.productId, colourId: quotation.colourId },
  });

  const buffer = await renderToBuffer(
    <QuotationDocument data={toQuotationPdfData(quotation, image?.imagePath ?? "", settings.gstPercent)} />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.quotationNumber}.pdf"`,
    },
  });
}
