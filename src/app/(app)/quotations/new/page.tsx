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

  const [products, colours, colourImages, settings, prefill, recentQuotes] = await Promise.all([
    prisma.product.findMany({ include: { pricingSlabs: true } }),
    prisma.colour.findMany(),
    prisma.productColourImage.findMany(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    searchParams,
    prisma.quotation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { productId: true, unitRate: true, quotationNumber: true, quantity: true },
    }),
  ]);

  const lastQuotesByProduct: {
    productId: string;
    unitRate: number;
    quotationNumber: string;
    quantity: number;
  }[] = [];
  const seen = new Set<string>();
  for (const q of recentQuotes) {
    if (seen.has(q.productId)) continue;
    seen.add(q.productId);
    lastQuotesByProduct.push(q);
  }

  return (
    <div>
      <PageHeader
        title={prefill.revises ? `Revise ${prefill.revises}` : "New quotation"}
        description="Select product, quantity and colour. Review the suggested price, then save and export PDF."
        help={{
          content: (
            <>
              <p>Unit rate is suggested from the product base rate and quantity slabs. You can edit it before saving — the suggestion never overrides silently.</p>
              <p>Saving creates a quotation number you can export as PDF or confirm as a sales order.</p>
            </>
          ),
        }}
      />
      <NewQuotationForm
        products={products}
        colours={colours}
        colourImages={colourImages}
        gstPercent={settings.gstPercent}
        lastQuotesByProduct={lastQuotesByProduct}
        initialProductId={prefill.productId}
        initialColourId={prefill.colourId}
        initialQuantity={prefill.quantity ? Number(prefill.quantity) : undefined}
        initialLocation={prefill.location}
        revisesQuotationNumber={prefill.revises}
      />
    </div>
  );
}
