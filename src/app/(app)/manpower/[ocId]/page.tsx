import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { getWorkingDayConfig } from "@/lib/actions-manpower";
import { PageHeader } from "@/components/layout/page-header";
import { ManpowerDetailClient } from "@/components/manpower/manpower-detail-client";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ManpowerDetailPage({ params }: { params: Promise<{ ocId: string }> }) {
  const { ocId } = await params;

  const [oc, products, colours, departments, settings, config, session] = await Promise.all([
    prisma.orderConfirmation.findUnique({
      where: { id: ocId },
      include: {
        product: { include: { materials: true } },
        colour: true,
        manpowerPlan: true,
      },
    }),
    prisma.product.findMany({ include: { materials: true } }),
    prisma.colour.findMany(),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getWorkingDayConfig(),
    getSession(),
  ]);
  if (!oc) notFound();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const initialRange = oc.manpowerPlan
    ? { from: oc.manpowerPlan.startDate, to: oc.manpowerPlan.endDate }
    : { from: oc.plannedAt, to: addDays(oc.plannedAt, oc.targetDays) };

  const constants = {
    procurementWorkingDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };

  return (
    <div>
      <PageHeader
        title={oc.ocNumber}
        description={`${oc.product.name} · ${oc.colour.name} · ${formatNumber(oc.quantity)} units`}
      />
      <ManpowerDetailClient
        oc={{
          id: oc.id,
          ocNumber: oc.ocNumber,
          quantity: oc.quantity,
          product: oc.product,
          colour: oc.colour,
        }}
        products={products}
        colours={colours}
        departments={departments}
        constants={constants}
        workingDayConfig={config}
        initialRange={initialRange}
        canWrite={canWrite}
      />
    </div>
  );
}
