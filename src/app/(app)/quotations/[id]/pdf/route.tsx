import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { QuotationDocument } from "@/lib/pdf/quotation-document";
import { COLOUR_OUTLINE } from "@/lib/colours";

const PRODUCT_DESCRIPTIONS: Record<string, string> = {
  MASTRO: "Ergonomic visitor chair with a moulded shell, fabricated steel frame and powder-coated finish.",
};

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { product: true, colour: true },
  });
  if (!quotation) {
    return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
  }

  const buffer = await renderToBuffer(
    <QuotationDocument
      data={{
        quotationNumber: quotation.quotationNumber,
        date: quotation.createdAt,
        productName: quotation.product.name,
        productCode: quotation.product.code,
        description: PRODUCT_DESCRIPTIONS[quotation.product.code] ?? "",
        colourName: quotation.colour.name,
        colourHex: quotation.colour.hexCode,
        colourOutlineHex: COLOUR_OUTLINE[quotation.colour.name] ?? "#292524",
        quantity: quotation.quantity,
        unitRate: quotation.unitRate,
        lineTotal: quotation.lineTotal,
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
