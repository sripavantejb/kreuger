"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { computeUnitRate } from "./pricing";
import { planCapacity } from "./planning";
import { buildStageList, nextStage, PROCUREMENT_STAGE, FINISHED_GOODS_STAGE } from "./stages";
import { buildDeadlineBreachAlert, buildStageEntryAlert, getContactDirectory } from "./alerts";
import { requireRole } from "./auth";
import { maybeSendAlertEmail } from "./email";

async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count();
  return `Q-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createQuotation(input: {
  productId: string;
  quantity: number;
  colourId: string;
  revisesQuotationNumber?: string;
}) {
  await requireRole("MANAGER");
  const product = await prisma.product.findUniqueOrThrow({
    where: { id: input.productId },
    include: { pricingSlabs: true },
  });
  const unitRate = computeUnitRate(product.baseRate, input.quantity, product.pricingSlabs);
  const lineTotal = unitRate * input.quantity;
  const quotationNumber = await nextQuotationNumber();

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      productId: input.productId,
      quantity: input.quantity,
      colourId: input.colourId,
      unitRate,
      lineTotal,
      revisesQuotationNumber: input.revisesQuotationNumber,
    },
  });
  revalidatePath("/quotations");
  revalidatePath("/");
  return quotation.id;
}

export async function deleteQuotation(id: string) {
  await requireRole("MANAGER");
  await prisma.quotation.delete({ where: { id } });
  revalidatePath("/quotations");
  revalidatePath("/");
}

async function nextOcNumber(): Promise<string> {
  const count = await prisma.orderConfirmation.count();
  return `OC${10001 + count}`;
}

export async function createOrder(input: {
  productId: string;
  quantity: number;
  colourId: string;
  targetDays: number;
  ocNumber?: string;
}) {
  await requireRole("MANAGER");
  const [product, colour, departments, settings, directory] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: input.productId } }),
    prisma.colour.findUniqueOrThrow({ where: { id: input.colourId } }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getContactDirectory(),
  ]);
  const constants = {
    procurementDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };
  const result = planCapacity(input.quantity, input.targetDays, departments, constants);
  if (result.status !== "ok") {
    throw new Error("Cannot release an OC with a blocked plan. Adjust the target timeline first.");
  }

  const ocNumber = input.ocNumber?.trim() || (await nextOcNumber());
  const now = new Date();

  const oc = await prisma.orderConfirmation.create({
    data: {
      ocNumber,
      productId: input.productId,
      quantity: input.quantity,
      colourId: input.colourId,
      targetDays: input.targetDays,
      plannedAt: now,
      currentStage: PROCUREMENT_STAGE,
      status: "in_progress",
    },
  });

  await Promise.all(
    result.departmentPlans.map((line) =>
      prisma.ocDepartmentPlan.create({
        data: {
          ocId: oc.id,
          departmentId: line.departmentId,
          workersRequired: line.workers,
          stageHours: line.stageHours,
          stageDays: line.stageDays,
        },
      })
    )
  );

  await prisma.ocStageEvent.create({
    data: {
      ocId: oc.id,
      stageName: PROCUREMENT_STAGE,
      enteredAt: now,
      deadlineDays: settings.procurementDays,
      breached: false,
    },
  });

  const alertData = buildStageEntryAlert({
    ocNumber,
    productName: product.name,
    quantity: input.quantity,
    colourName: colour.name,
    stageName: PROCUREMENT_STAGE,
    directory,
  });
  const alert = await prisma.alert.create({ data: { ocId: oc.id, ...alertData } });
  await maybeSendAlertEmail(alert);

  revalidatePath("/orders");
  revalidatePath("/");
  return oc.id;
}

export async function cancelOrder(ocId: string) {
  await requireRole("MANAGER");
  const oc = await prisma.orderConfirmation.findUniqueOrThrow({ where: { id: ocId } });
  if (oc.status === "closed") throw new Error("Cannot cancel a closed order.");
  await prisma.orderConfirmation.update({ where: { id: ocId }, data: { status: "cancelled" } });
  revalidatePath(`/orders/${ocId}`);
  revalidatePath("/orders");
  revalidatePath("/");
}

export async function advanceStage(ocId: string) {
  await requireRole("MANAGER");
  const [oc, departments, directory] = await Promise.all([
    prisma.orderConfirmation.findUniqueOrThrow({
      where: { id: ocId },
      include: {
        product: true,
        colour: true,
        events: { orderBy: { enteredAt: "desc" } },
        plan: { include: { department: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    getContactDirectory(),
  ]);

  if (oc.status === "cancelled") throw new Error("Cannot advance a cancelled order.");

  const stageList = buildStageList(departments.map((d) => d.name));
  const openEvent = oc.events.find((e) => !e.exitedAt);
  if (!openEvent) throw new Error("No open stage to advance from.");

  const next = nextStage(stageList, oc.currentStage);
  if (!next) throw new Error("Order is already at the terminal stage.");

  const now = new Date();
  const elapsedHours = (now.getTime() - openEvent.enteredAt.getTime()) / (1000 * 60 * 60);
  const elapsedDays = elapsedHours / 24;
  const breached = openEvent.breached || elapsedDays > openEvent.deadlineDays;

  await prisma.ocStageEvent.update({
    where: { id: openEvent.id },
    data: { exitedAt: now, durationHours: elapsedHours, breached },
  });

  if (breached) {
    const breachAlertData = buildDeadlineBreachAlert({
      ocNumber: oc.ocNumber,
      productName: oc.product.name,
      quantity: oc.quantity,
      stageName: openEvent.stageName,
      deadlineDays: openEvent.deadlineDays,
      elapsedDays,
      directory,
    });
    const breachAlert = await prisma.alert.create({ data: { ocId: oc.id, ...breachAlertData } });
    await maybeSendAlertEmail(breachAlert);
  }

  const nextDeadline =
    next === FINISHED_GOODS_STAGE
      ? 0
      : oc.plan.find((p) => p.department.name === next)?.stageDays ?? 0;

  await prisma.ocStageEvent.create({
    data: {
      ocId: oc.id,
      stageName: next,
      enteredAt: now,
      deadlineDays: nextDeadline,
      breached: false,
    },
  });

  const entryAlertData = buildStageEntryAlert({
    ocNumber: oc.ocNumber,
    productName: oc.product.name,
    quantity: oc.quantity,
    colourName: oc.colour.name,
    stageName: next,
    directory,
  });
  const entryAlert = await prisma.alert.create({ data: { ocId: oc.id, ...entryAlertData } });
  await maybeSendAlertEmail(entryAlert);

  await prisma.orderConfirmation.update({
    where: { id: oc.id },
    data: {
      currentStage: next,
      status: next === FINISHED_GOODS_STAGE ? "closed" : "in_progress",
    },
  });

  revalidatePath(`/orders/${ocId}`);
  revalidatePath("/orders");
  revalidatePath("/alerts");
  revalidatePath("/");
}

export async function updateDepartment(input: {
  id: string;
  headcount: number;
  unitsPerWorkerPerDay: number;
  maxUnitsPerDay: number;
}) {
  await requireRole("ADMIN");
  await prisma.department.update({
    where: { id: input.id },
    data: {
      headcount: input.headcount,
      unitsPerWorkerPerDay: input.unitsPerWorkerPerDay,
      maxUnitsPerDay: input.maxUnitsPerDay,
    },
  });
  revalidatePath("/master-data");
  revalidatePath("/orders");
}

export async function updatePricingSlab(input: {
  id: string;
  minQuantity: number;
  maxQuantity: number | null;
  discountPercent: number;
}) {
  await requireRole("ADMIN");
  await prisma.pricingSlab.update({
    where: { id: input.id },
    data: {
      minQuantity: input.minQuantity,
      maxQuantity: input.maxQuantity,
      discountPercent: input.discountPercent,
    },
  });
  revalidatePath("/master-data");
  revalidatePath("/quotations");
}

export async function updateMaterial(input: {
  id: string;
  quantityPerUnit: number;
}) {
  await requireRole("ADMIN");
  await prisma.productMaterial.update({
    where: { id: input.id },
    data: { quantityPerUnit: input.quantityPerUnit },
  });
  revalidatePath("/master-data");
}

export async function updateSettings(input: {
  procurementDays: number;
  rampDays: number;
  shiftHours: number;
}) {
  await requireRole("ADMIN");
  await prisma.settings.update({
    where: { id: 1 },
    data: input,
  });
  revalidatePath("/master-data");
  revalidatePath("/orders");
}
