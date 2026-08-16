"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { computeUnitRate } from "./pricing";
import { planCapacity } from "./planning";
import { applyProductDepartmentRates } from "./product-department-rates";
import { buildStageList, nextStage, PROCUREMENT_STAGE, FINISHED_GOODS_STAGE } from "./stages";
import { getContactDirectory, notify, dashboardLink } from "./alerts";
import { requireRole, getSession } from "./auth";
import { saveManpowerPlan } from "./actions-manpower";
import { isPriority, type Priority } from "./priority";
import { computeMaterialRequirements } from "./materials";
import { formatDate } from "./format";

async function nextQuotationNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.quotation.count();
  return `Q-${year}-${String(count + 1).padStart(4, "0")}`;
}

export type CreateQuotationLineInput = {
  productId: string;
  colourId: string;
  quantity: number;
  unitRate?: number;
  location?: string;
};

export type CreateQuotationInput = {
  /** One or more product lines. First line is mirrored onto Quotation header fields for list views. */
  lines: CreateQuotationLineInput[];
  revisesQuotationNumber?: string;
  vendorName?: string;
  vendorAddress?: string;
  vendorState?: string;
  vendorStateCode?: string;
  vendorGstin?: string;
  shipToName?: string;
  shipToAddress?: string;
  shipToState?: string;
  shipToStateCode?: string;
  shipToGstin?: string;
  deliveryDate?: string | null;
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  buyerName?: string;
  vendorRefNo?: string;
  remarks?: string;
  paymentTerms?: string;
  discountPercent?: number;
};

export async function createQuotation(input: CreateQuotationInput) {
  await requireRole("MANAGER");
  if (!input.lines?.length) throw new Error("Add at least one product line.");

  const prepared = [];
  for (let i = 0; i < input.lines.length; i++) {
    const line = input.lines[i];
    if (!line.productId || !line.colourId || line.quantity < 1) {
      throw new Error(`Line ${i + 1} is incomplete.`);
    }
    const product = await prisma.product.findUniqueOrThrow({
      where: { id: line.productId },
      include: { pricingSlabs: true },
    });
    const suggested = computeUnitRate(product.baseRate, line.quantity, product.pricingSlabs);
    const unitRate =
      typeof line.unitRate === "number" && Number.isFinite(line.unitRate) && line.unitRate > 0
        ? line.unitRate
        : suggested;
    prepared.push({
      sortOrder: i,
      productId: line.productId,
      colourId: line.colourId,
      quantity: line.quantity,
      unitRate,
      lineTotal: unitRate * line.quantity,
      location: line.location?.trim() ?? "",
    });
  }

  const first = prepared[0];
  const headerTotal = prepared.reduce((sum, l) => sum + l.lineTotal, 0);
  const quotationNumber = await nextQuotationNumber();

  const quotation = await prisma.quotation.create({
    data: {
      quotationNumber,
      productId: first.productId,
      quantity: first.quantity,
      colourId: first.colourId,
      unitRate: first.unitRate,
      lineTotal: headerTotal,
      location: first.location,
      revisesQuotationNumber: input.revisesQuotationNumber,
      vendorName: input.vendorName?.trim() ?? "",
      vendorAddress: input.vendorAddress?.trim() ?? "",
      vendorState: input.vendorState?.trim() ?? "",
      vendorStateCode: input.vendorStateCode?.trim() ?? "",
      vendorGstin: input.vendorGstin?.trim() ?? "",
      shipToName: input.shipToName?.trim() ?? "",
      shipToAddress: input.shipToAddress?.trim() ?? "",
      shipToState: input.shipToState?.trim() ?? "",
      shipToStateCode: input.shipToStateCode?.trim() ?? "",
      shipToGstin: input.shipToGstin?.trim() ?? "",
      deliveryDate: input.deliveryDate ? new Date(input.deliveryDate) : null,
      contactPerson: input.contactPerson?.trim() ?? "",
      contactPhone: input.contactPhone?.trim() ?? "",
      contactEmail: input.contactEmail?.trim() ?? "",
      buyerName: input.buyerName?.trim() ?? "",
      vendorRefNo: input.vendorRefNo?.trim() ?? "",
      remarks: input.remarks?.trim() ?? "",
      paymentTerms: input.paymentTerms?.trim() || "Advance 100%",
      discountPercent: input.discountPercent ?? 0,
      lines: { create: prepared },
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
  priority?: Priority;
  salesOrderId?: string;
}) {
  await requireRole("MANAGER");
  const session = await getSession();
  const actor = session?.name ?? "";

  if (input.salesOrderId) {
    const so = await prisma.salesOrder.findUniqueOrThrow({ where: { id: input.salesOrderId } });
    if (so.status === "rejected") throw new Error("Cannot release a rejected sales order.");
    const existing = await prisma.orderConfirmation.findFirst({ where: { salesOrderId: input.salesOrderId } });
    if (existing) throw new Error("This sales order already has an OC.");
  }

  const [product, colour, departments, settings, directory, departmentRates] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: input.productId } }),
    prisma.colour.findUniqueOrThrow({ where: { id: input.colourId } }),
    prisma.department.findMany({ orderBy: { sequence: "asc" } }),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    getContactDirectory(),
    prisma.productDepartmentRate.findMany({ where: { productId: input.productId } }),
  ]);
  const constants = {
    procurementDays: settings.procurementDays,
    rampDays: settings.rampDays,
    shiftHours: settings.shiftHours,
  };
  const effectiveDepartments = applyProductDepartmentRates(departments, departmentRates);
  const result = planCapacity(input.quantity, input.targetDays, effectiveDepartments, constants);
  if (result.status !== "ok") {
    throw new Error("Cannot release an OC with a blocked plan. Adjust the target timeline first.");
  }

  const ocNumber = input.ocNumber?.trim() || (await nextOcNumber());
  const now = new Date();
  const priority = input.priority && isPriority(input.priority) ? input.priority : "NORMAL";

  const oc = await prisma.orderConfirmation.create({
    data: {
      ocNumber,
      productId: input.productId,
      quantity: input.quantity,
      colourId: input.colourId,
      targetDays: input.targetDays,
      priority,
      salesOrderId: input.salesOrderId,
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
      updatedBy: actor,
    },
  });

  const expected = new Date(now.getTime() + settings.procurementDays * 86_400_000);
  await notify({
    type: "stage_entry",
    dedupeKey: `stage_entry:${oc.id}:${PROCUREMENT_STAGE}:${now.toISOString()}`,
    ocId: oc.id,
    stageName: PROCUREMENT_STAGE,
    directory,
    context: {
      ocNumber,
      productName: product.name,
      quantity: input.quantity,
      colourName: colour.name,
      currentStage: PROCUREMENT_STAGE,
      previousStage: "—",
      stageStartTime: formatDate(now),
      expectedCompletion: formatDate(expected),
      status: "In progress",
      priority,
      requiredAction: "Plan procurement and confirm material readiness.",
      dashboardUrl: dashboardLink(`/orders/${oc.id}`),
    },
  });

  if (priority === "URGENT" || priority === "HIGH") {
    await notify({
      type: "urgent_order",
      dedupeKey: `urgent_order:${oc.id}`,
      ocId: oc.id,
      directory,
      context: {
        ocNumber,
        productName: product.name,
        quantity: input.quantity,
        colourName: colour.name,
        priority,
        currentStage: PROCUREMENT_STAGE,
        status: "Released to production",
        requiredAction: "Prioritise capacity and expedite procurement.",
        dashboardUrl: dashboardLink(`/orders/${oc.id}`),
      },
    });
  }

  const productWithMats = await prisma.product.findUniqueOrThrow({
    where: { id: input.productId },
    include: { materials: true },
  });
  const matLines = computeMaterialRequirements(productWithMats.materials, input.quantity);
  const shortages = matLines.filter((m) => m.status === "SHORTAGE");
  if (shortages.length > 0) {
    await notify({
      type: "material_shortage",
      dedupeKey: `material_shortage:${oc.id}`,
      ocId: oc.id,
      directory,
      context: {
        ocNumber,
        productName: product.name,
        quantity: input.quantity,
        colourName: colour.name,
        currentStage: PROCUREMENT_STAGE,
        status: "SHORTAGE",
        materialsSummary: shortages
          .map((m) => `${m.materialName}: need ${m.requiredQty} ${m.unit}, short ${m.shortage} ${m.unit}`)
          .join("; "),
        requiredAction: "Raise procurement for short materials (demo stock — not SAP).",
        dashboardUrl: dashboardLink(`/orders/${oc.id}`),
      },
    });
  }

  try {
    await saveManpowerPlan({
      ocId: oc.id,
      startDate: now,
      endDate: new Date(now.getTime() + input.targetDays * 24 * 60 * 60 * 1000),
    });
  } catch (err) {
    console.error("Failed to seed default manpower plan:", err);
  }

  revalidatePath("/orders");
  revalidatePath("/");
  revalidatePath("/manpower");
  revalidatePath("/follow-up");
  revalidatePath("/alerts");
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
  const session = await getSession();
  const actor = session?.name ?? "";
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
    data: { exitedAt: now, durationHours: elapsedHours, breached, updatedBy: actor || openEvent.updatedBy },
  });

  if (breached) {
    await notify({
      type: "deadline_breach",
      dedupeKey: `deadline_breach:${oc.id}:${openEvent.id}`,
      ocId: oc.id,
      stageName: openEvent.stageName,
      directory,
      context: {
        ocNumber: oc.ocNumber,
        productName: oc.product.name,
        quantity: oc.quantity,
        colourName: oc.colour.name,
        currentStage: openEvent.stageName,
        previousStage: openEvent.stageName,
        deadline: `${openEvent.deadlineDays.toFixed(1)} day(s)`,
        stageStartTime: formatDate(openEvent.enteredAt),
        status: `Breached — elapsed ${elapsedDays.toFixed(1)} day(s)`,
        priority: oc.priority,
        requiredAction: "Expedite and advise on a revised timeline.",
        dashboardUrl: dashboardLink(`/orders/${oc.id}`),
      },
    });
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
      updatedBy: actor,
    },
  });

  const nextExpected = new Date(now.getTime() + nextDeadline * 86_400_000);
  await notify({
    type: next === FINISHED_GOODS_STAGE ? "oc_completed" : "stage_entry",
    dedupeKey: `stage_entry:${oc.id}:${next}:${now.toISOString()}`,
    ocId: oc.id,
    stageName: next,
    directory,
    context: {
      ocNumber: oc.ocNumber,
      productName: oc.product.name,
      quantity: oc.quantity,
      colourName: oc.colour.name,
      previousStage: openEvent.stageName,
      currentStage: next,
      stageStartTime: formatDate(now),
      expectedCompletion: nextDeadline > 0 ? formatDate(nextExpected) : "—",
      status: next === FINISHED_GOODS_STAGE ? "Completed" : "In progress",
      priority: oc.priority,
      requiredAction:
        next === FINISHED_GOODS_STAGE
          ? "Confirm finished goods and close dispatch."
          : "Plan capacity and confirm stage receipt.",
      dashboardUrl: dashboardLink(`/orders/${oc.id}`),
    },
  });

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
  revalidatePath("/follow-up");
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
  demoAvailableQty?: number;
}) {
  await requireRole("ADMIN");
  await prisma.productMaterial.update({
    where: { id: input.id },
    data: {
      quantityPerUnit: input.quantityPerUnit,
      ...(typeof input.demoAvailableQty === "number" ? { demoAvailableQty: input.demoAvailableQty } : {}),
    },
  });
  revalidatePath("/master-data");
}

export async function updateSettings(input: {
  procurementDays: number;
  rampDays: number;
  shiftHours: number;
  gstPercent: number;
}) {
  await requireRole("ADMIN");
  await prisma.settings.update({
    where: { id: 1 },
    data: input,
  });
  revalidatePath("/master-data");
  revalidatePath("/orders");
  revalidatePath("/quotations");
}
