import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { NewQuotationForm } from "@/components/quotations/new-quotation-form";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ productId?: string; colourId?: string; quantity?: string; revises?: string }>;
}) {
  const session = await getSession();
  if (!session || !roleAtLeast(session.role, "MANAGER")) redirect("/quotations");

  const [products, colours, colourImages, prefill] = await Promise.all([
    prisma.product.findMany({ include: { pricingSlabs: true } }),
    prisma.colour.findMany(),
    prisma.productColourImage.findMany(),
    searchParams,
  ]);

  return (
    <div>
      <PageHeader
        title={prefill.revises ? `Revise ${prefill.revises}` : "New quotation"}
        description="Pricing updates live as you change quantity."
      />
      <NewQuotationForm
        products={products}
        colours={colours}
        colourImages={colourImages}
        initialProductId={prefill.productId}
        initialColourId={prefill.colourId}
        initialQuantity={prefill.quantity ? Number(prefill.quantity) : undefined}
        revisesQuotationNumber={prefill.revises}
      />
    </div>
  );
}
