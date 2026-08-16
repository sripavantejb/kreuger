import { prisma } from "@/lib/prisma";
import { getWorkingDayConfig } from "@/lib/actions-manpower";
import { PageHeader } from "@/components/layout/page-header";
import { ManpowerCustomClient } from "@/components/manpower/manpower-custom-client";

export const dynamic = "force-dynamic";

export default async function ManpowerCustomPage() {
  const [products, departments, settings, config] = await Promise.all([
    prisma.product.findMany({ include: { materials: true } }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getWorkingDayConfig(),
  ]);

  const constants = {
    procurementWorkingDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };

  return (
    <div>
      <PageHeader
        title="Custom manpower plan"
        description="Enter a quantity and date range for any product — no order confirmation required."
      />
      <ManpowerCustomClient
        products={products}
        departments={departments}
        constants={constants}
        workingDayConfig={config}
      />
    </div>
  );
}
