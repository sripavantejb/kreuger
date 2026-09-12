"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole } from "./auth";
import {
  planManpower,
  planManpowerFromWorkers,
  totalWorkingDaysForResult,
  type ManpowerLine,
  type ManpowerPlanningMode,
} from "./manpower";
import { workingDaysBetween, addWorkingDays, type WorkingDayConfig } from "./working-days";
import { applyProductDepartmentRates } from "./product-department-rates";

export async function getWorkingDayConfig(): Promise<WorkingDayConfig> {
  const [settings, holidays] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.holiday.findMany(),
  ]);
  return { weeklyOff: settings.weeklyOff, holidays: holidays.map((h) => h.date) };
}

// Every exported function in a "use server" file gets its own invokable
// action id regardless of whether any client component references it, so
// this checks role itself rather than trusting a caller to have already
// checked — including when called from the OC-creation hook.
export async function saveManpowerPlan(input: {
  ocId: string;
  startDate: Date;
  endDate?: Date;
  mode?: ManpowerPlanningMode;
  workersByDepartment?: Record<string, number>;
  overtimeHoursPerDay?: number;
}) {
  // Plant heads adjust shop-floor headcount; managers/admins keep full access.
  await requireRole("HEAD");

  const mode: ManpowerPlanningMode = input.mode ?? "date";
  const overtimeHoursPerDay = Math.max(0, input.overtimeHoursPerDay ?? 0);
  const oc = await prisma.orderConfirmation.findUniqueOrThrow({
    where: { id: input.ocId },
    include: { product: { include: { materials: true } } },
  });
  const [departments, settings, config, departmentRates] = await Promise.all([
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getWorkingDayConfig(),
    prisma.productDepartmentRate.findMany({ where: { productId: oc.productId } }),
  ]);

  const constants = {
    procurementWorkingDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };
  const effectiveDepartments = applyProductDepartmentRates(departments, departmentRates);

  let startDate = input.startDate;
  let endDate = input.endDate ?? input.startDate;
  let workingDays: number;
  let result;

  if (mode === "workers") {
    const workersByDepartment = input.workersByDepartment ?? {};
    result = planManpowerFromWorkers(
      oc.quantity,
      workersByDepartment,
      effectiveDepartments,
      constants,
      oc.product.materials,
      overtimeHoursPerDay
    );
    if (result.status === "achievable") {
      const totalDays = Math.ceil(totalWorkingDaysForResult(result, constants));
      workingDays = totalDays;
      endDate = addWorkingDays(startDate, Math.max(totalDays, 1), config);
      // Align persisted working-day count with the inclusive range we store.
      workingDays = workingDaysBetween(startDate, endDate, config);
    } else {
      workingDays = workingDaysBetween(startDate, endDate, config);
    }
  } else {
    if (!input.endDate) throw new Error("End date is required for date-based plans.");
    endDate = input.endDate;
    workingDays = workingDaysBetween(startDate, endDate, config);
    result = planManpower(
      oc.quantity,
      workingDays,
      effectiveDepartments,
      constants,
      oc.product.materials,
      overtimeHoursPerDay
    );
  }

  const plan = await prisma.manpowerPlan.upsert({
    where: { ocId: input.ocId },
    create: {
      ocId: input.ocId,
      startDate,
      endDate,
      workingDays,
      requiredRate: result.requiredRate ?? undefined,
      status: result.status,
      planningMode: mode,
      overtimeHoursPerDay,
    },
    update: {
      startDate,
      endDate,
      workingDays,
      requiredRate: result.requiredRate ?? undefined,
      status: result.status,
      planningMode: mode,
      overtimeHoursPerDay,
      computedAt: new Date(),
    },
  });

  await prisma.manpowerPlanLine.deleteMany({ where: { planId: plan.id } });
  if (result.status === "achievable") {
    await Promise.all(
      result.lines.map((l: ManpowerLine) =>
        prisma.manpowerPlanLine.create({
          data: {
            planId: plan.id,
            departmentId: l.departmentId,
            workersRequired: l.workers,
            workingDays: l.workingDays,
            workingHours: l.workingHours,
            manHours: l.manHours,
            regularManHours: l.regularManHours,
            overtimeManHours: l.overtimeManHours,
            utilisation: l.utilisation,
          },
        })
      )
    );
  }

  revalidatePath(`/manpower/${input.ocId}`);
  revalidatePath("/manpower");
  return { result, endDate, workingDays, mode };
}

export async function updateWeeklyOff(weeklyOff: string[]) {
  await requireRole("ADMIN");
  await prisma.settings.update({ where: { id: 1 }, data: { weeklyOff } });
  revalidatePath("/master-data");
  revalidatePath("/manpower");
}

export async function addHoliday(input: { date: Date; name: string }) {
  await requireRole("ADMIN");
  await prisma.holiday.create({ data: input });
  revalidatePath("/master-data");
  revalidatePath("/manpower");
}

export async function deleteHoliday(id: string) {
  await requireRole("ADMIN");
  await prisma.holiday.delete({ where: { id } });
  revalidatePath("/master-data");
  revalidatePath("/manpower");
}
