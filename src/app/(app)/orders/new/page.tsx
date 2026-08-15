import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { NewOrderForm } from "@/components/orders/new-order-form";

export const dynamic = "force-dynamic";

export default async function NewOrderPage() {
  const session = await getSession();
  if (!session || !roleAtLeast(session.role, "MANAGER")) redirect("/orders");

  const [products, colours, departments, settings, ocCount] = await Promise.all([
    prisma.product.findMany({ include: { materials: true } }),
    prisma.colour.findMany(),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.orderConfirmation.count(),
  ]);

  const constants = {
    procurementDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };

  return (
    <div>
      <PageHeader
        title="New order confirmation"
        description="Adjust the target timeline and watch the capacity plan recompute live."
      />
      <NewOrderForm
        products={products}
        colours={colours}
        departments={departments}
        constants={constants}
        suggestedOcNumber={`OC${10001 + ocCount}`}
      />
    </div>
  );
}
