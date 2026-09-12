import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { getWorkingDayConfig } from "@/lib/actions-manpower";
import { PageHeader } from "@/components/layout/page-header";
import { ManpowerDetailClient } from "@/components/manpower/manpower-detail-client";
import { formatNumber } from "@/lib/format";
import type { ManpowerPlanningMode } from "@/lib/manpower";

export const dynamic = "force-dynamic";

export default async function ManpowerDetailPage({ params }: { params: Promise<{ ocId: string }> }) {
  const { ocId } = await params;

  const [oc, products, colours, departments, settings, config, session] = await Promise.all([
    prisma.orderConfirmation.findUnique({
      where: { id: ocId },
      include: {
        product: { include: { materials: true, departmentRates: true } },
        colour: true,
        manpowerPlan: { include: { lines: true } },
      },
    }),
    prisma.product.findMany({ include: { materials: true, departmentRates: true } }),
    prisma.colour.findMany(),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getWorkingDayConfig(),
    getSession(),
  ]);
  if (!oc) notFound();
  const canWrite = session ? roleAtLeast(session.role, "HEAD") : false;

  const initialRange = oc.manpowerPlan
    ? { from: oc.manpowerPlan.startDate, to: oc.manpowerPlan.endDate }
    : { from: oc.plannedAt, to: addDays(oc.plannedAt, oc.targetDays) };

  const initialMode: ManpowerPlanningMode =
    oc.manpowerPlan?.planningMode === "workers" ? "workers" : "date";

  const initialWorkers = Object.fromEntries(
    (oc.manpowerPlan?.lines ?? []).map((l) => [l.departmentId, l.workersRequired])
  );
  const initialOvertimeHoursPerDay = oc.manpowerPlan?.overtimeHoursPerDay ?? 0;

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
        help={{
          content: (
            <>
              <p>
                Plan this order by date range or by workers. Optionally add overtime hours beyond the
                standard shift to raise daily capacity and shorten the schedule.
              </p>
              <ul>
                <li>
                  <strong>By dates</strong> — pick start/end; calculator returns workers, hours and
                  utilisation.
                </li>
                <li>
                  <strong>By workers</strong> — edit people per department (roster pool shown);
                  calculator returns working days and projected end date.
                </li>
                <li>
                  <strong>Overtime</strong> — extra hours per working day scale worker output and
                  department ceilings; results show OT man-hours separately.
                </li>
                <li>
                  <strong>Blocked</strong> — window too short, capacity exceeded, or a department has
                  zero workers. Try overtime when capacity is the blocker.
                </li>
                <li>
                  <strong>What-if override</strong> — try a different product, quantity or colour
                  without touching the saved plan.
                </li>
                <li>
                  <strong>Save plan</strong> — Head / Manager / Admin can persist the plan against
                  the real OC product and quantity.
                </li>
              </ul>
            </>
          ),
        }}
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
        initialMode={initialMode}
        initialWorkers={initialWorkers}
        initialOvertimeHoursPerDay={initialOvertimeHoursPerDay}
        canWrite={canWrite}
      />
    </div>
  );
}
