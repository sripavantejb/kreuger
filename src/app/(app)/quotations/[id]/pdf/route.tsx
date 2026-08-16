import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotationDocument } from "@/lib/pdf/quotation-document";
import { COLOUR_OUTLINE } from "@/lib/colours";

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
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }
  const image = await prisma.productColourImage.findFirst({
    where: { productId: quotation.productId, colourId: quotation.colourId },
  });

  const buffer = await renderToBuffer(
    <QuotationDocument
      data={{
        quotationNumber: quotation.quotationNumber,
        date: quotation.createdAt,
        productName: quotation.product.name,
        productCode: quotation.product.code,
        description: quotation.product.description,
        imagePath: image?.imagePath ?? "",
        colourName: quotation.colour.name,
        colourHex: quotation.colour.hexCode,
        colourOutlineHex: COLOUR_OUTLINE[quotation.colour.name] ?? "#292524",
        location: quotation.location,
        quantity: quotation.quantity,
        unitRate: quotation.unitRate,
        lineTotal: quotation.lineTotal,
        gstPercent: settings.gstPercent,
      }}
    />
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quotation.quotationNumber}.pdf"`,
    },
  });
}
