import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductBasicForm } from "@/components/master-data/product-basic-form";
import { PricingSlabsTable } from "@/components/master-data/pricing-slabs-table";
import { MaterialsTable } from "@/components/master-data/materials-table";
import { DepartmentRatesForm } from "@/components/master-data/department-rates-form";
import { ProductColourImagesForm } from "@/components/master-data/product-colour-images-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, session, departments, colours] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { pricingSlabs: true, materials: true, departmentRates: true, colourImages: true },
    }),
    getSession(),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.colour.findMany(),
  ]);
  if (!product) notFound();
  const readOnly = !session || !roleAtLeast(session.role, "ADMIN");

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Code ${product.code}`}
        help={{
          content: (
            <>
              <p>Everything on this page is specific to {product.name} and feeds directly into orders and manpower plans for it.</p>
              <ul>
                <li><strong>Basics</strong> — name, code, base rate and the default lead days pre-filled on a new order for this product.</li>
                <li><strong>Pricing slabs</strong> — quantity breakpoints and the discount each unlocks on the base rate.</li>
                <li><strong>Materials per unit</strong> — the raw materials consumed, used to size procurement.</li>
                <li><strong>Stage / department rates</strong> — override a department&apos;s units-per-worker-per-day or daily ceiling for this product alone; leave a stage as &quot;Using default&quot; to fall back to the global Departments setting.</li>
                <li><strong>Photos by colour</strong> — upload a real product photo per colour; it appears on the quotation preview and PDF instead of a plain swatch.</li>
              </ul>
            </>
          ),
        }}
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/master-data" />}>
            <ArrowLeft /> Back to master data
          </Button>
        }
      />
      <div className="space-y-8 px-4 sm:px-6 md:px-8 py-6">
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
        <div>
          <h2 className="mb-3 text-sm font-semibold">Stage / department rates</h2>
          <DepartmentRatesForm
            productId={product.id}
            departments={departments}
            overrides={product.departmentRates}
            readOnly={readOnly}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-semibold">Photos by colour</h2>
          <ProductColourImagesForm
            productId={product.id}
            colours={colours}
            colourImages={product.colourImages}
            readOnly={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
