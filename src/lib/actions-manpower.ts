"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole } from "./auth";
import { planManpower, type ManpowerLine } from "./manpower";
import { workingDaysBetween, type WorkingDayConfig } from "./working-days";
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
export async function saveManpowerPlan(input: { ocId: string; startDate: Date; endDate: Date }) {
  await requireRole("MANAGER");

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

  const workingDays = workingDaysBetween(input.startDate, input.endDate, config);
  const constants = {
    procurementWorkingDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };
  const effectiveDepartments = applyProductDepartmentRates(departments, departmentRates);
  const result = planManpower(oc.quantity, workingDays, effectiveDepartments, constants, oc.product.materials);

  const plan = await prisma.manpowerPlan.upsert({
    where: { ocId: input.ocId },
    create: {
      ocId: input.ocId,
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      requiredRate: result.requiredRate ?? undefined,
      status: result.status,
    },
    update: {
      startDate: input.startDate,
      endDate: input.endDate,
      workingDays,
      requiredRate: result.requiredRate ?? undefined,
      status: result.status,
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
            utilisation: l.utilisation,
          },
        })
      )
    );
  }

  revalidatePath(`/manpower/${input.ocId}`);
  revalidatePath("/manpower");
  return result;
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
