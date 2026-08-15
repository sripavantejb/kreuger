import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductBasicForm } from "@/components/master-data/product-basic-form";
import { PricingSlabsTable } from "@/components/master-data/pricing-slabs-table";
import { MaterialsTable } from "@/components/master-data/materials-table";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { pricingSlabs: true, materials: true },
    }),
    getSession(),
  ]);
  if (!product) notFound();
  const readOnly = !session || !roleAtLeast(session.role, "ADMIN");

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Code ${product.code}`}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/master-data" />}>
            <ArrowLeft /> Back to master data
          </Button>
        }
      />
      <div className="space-y-8 px-8 py-6">
        <div>
          <h2 className="mb-3 text-sm font-semibold">Basics</h2>
          <ProductBasicForm product={product} readOnly={readOnly} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Pricing slabs</h2>
          <PricingSlabsTable productId={product.id} slabs={product.pricingSlabs} readOnly={readOnly} />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Materials per unit</h2>
          <MaterialsTable productId={product.id} materials={product.materials} readOnly={readOnly} />
        </div>
      </div>
    </div>
  );
}
