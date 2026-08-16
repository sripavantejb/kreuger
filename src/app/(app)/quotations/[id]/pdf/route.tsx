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
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

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

  const buffer = await renderToBuffer(
    <QuotationDocument
      data={toQuotationPdfData(withImages, imageFor(quotation.productId, quotation.colourId), settings.gstPercent)}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.quotationNumber}.pdf"`,
    },
  });
}
