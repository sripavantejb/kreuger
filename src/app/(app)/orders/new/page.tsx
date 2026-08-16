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
    prisma.product.findMany({ include: { materials: true, departmentRates: true } }),
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
        help={{
          content: (
            <>
              <p>Pick a product, quantity, colour and target timeline. The panel recomputes live and either shows an achievable capacity plan (workers needed per department) or tells you exactly which department is blocking it and the earliest realistic date.</p>
              <p>The target timeline pre-fills from the product&apos;s default lead days (set in Master Data) but can be adjusted per order. You can only release an order once the plan is achievable.</p>
            </>
          ),
        }}
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
