import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { NewQuotationForm } from "@/components/quotations/new-quotation-form";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{
    productId?: string;
    colourId?: string;
    quantity?: string;
    location?: string;
    revises?: string;
  }>;
}) {
  const session = await getSession();
  if (!session || !roleAtLeast(session.role, "MANAGER")) redirect("/quotations");

  const [products, colours, colourImages, settings, prefill] = await Promise.all([
    prisma.product.findMany({ include: { pricingSlabs: true } }),
    prisma.colour.findMany(),
    prisma.productColourImage.findMany(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    searchParams,
  ]);

  return (
    <div>
      <PageHeader
        title={prefill.revises ? `Revise ${prefill.revises}` : "New purchase order"}
        description="Line pricing updates live as you change quantity. Fill vendor and ship-to for the PO PDF."
        help={{
          content: (
            <>
              <p>Pick a product, colour and quantity — the unit rate updates live from that product&apos;s base rate and quantity discount slabs in Master Data.</p>
              <p>Saving creates a PO number you can export as a PDF matching the commercial Purchase Order layout.</p>
            </>
          ),
        }}
      />
      <NewQuotationForm
        products={products}
        colours={colours}
        colourImages={colourImages}
        gstPercent={settings.gstPercent}
        initialProductId={prefill.productId}
        initialColourId={prefill.colourId}
        initialQuantity={prefill.quantity ? Number(prefill.quantity) : undefined}
        initialLocation={prefill.location}
        revisesQuotationNumber={prefill.revises}
      />
    </div>
  );
}
