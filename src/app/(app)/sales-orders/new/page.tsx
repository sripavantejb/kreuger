import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { NewSalesOrderForm } from "@/components/sales-orders/new-sales-order-form";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage() {
  const session = await getSession();
  if (!session || !roleAtLeast(session.role, "MANAGER")) redirect("/sales-orders");

  const [products, colours] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.colour.findMany(),
  ]);

  return (
    <div>
      <PageHeader
        title="New sales order"
        description="Simulate a confirmed sales order (e.g. from Zoho). Notifies the sales coordinator for verification."
      />
      <PageBody>
        <NewSalesOrderForm products={products} colours={colours} />
      </PageBody>
    </div>
  );
}
