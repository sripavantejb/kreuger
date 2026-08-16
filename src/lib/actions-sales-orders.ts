"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole, getSession } from "./auth";
import {
  getContactDirectory,
  notify,
  dashboardLink,
} from "./alerts";
import { isPriority, type Priority } from "./priority";
import { createOrder } from "./actions";

async function nextSoNumber(): Promise<string> {
  const count = await prisma.salesOrder.count();
  return `SO${10001 + count}`;
}

export async function createSalesOrderFromQuotation(input: {
  quotationId: string;
  priority?: Priority;
  customerName?: string;
}) {
  await requireRole("MANAGER");
  const quotation = await prisma.quotation.findUniqueOrThrow({
    where: { id: input.quotationId },
    include: {
      product: true,
      colour: true,
      lines: { include: { product: true, colour: true }, orderBy: { sortOrder: "asc" } },
    },
  });

  const directory = await getContactDirectory();
  const priority = input.priority && isPriority(input.priority) ? input.priority : "NORMAL";
  const customerName = (input.customerName?.trim() || quotation.vendorName || quotation.buyerName || "").trim();

  const sourceLines =
    quotation.lines.length > 0
      ? quotation.lines.map((l) => ({
          productId: l.productId,
          colourId: l.colourId,
          quantity: l.quantity,
          productName: l.product.name,
          colourName: l.colour.name,
        }))
      : [
          {
            productId: quotation.productId,
            colourId: quotation.colourId,
            quantity: quotation.quantity,
            productName: quotation.product.name,
            colourName: quotation.colour.name,
          },
        ];

  let firstSoId = "";
  for (const line of sourceLines) {
    const soNumber = await nextSoNumber();
    const so = await prisma.salesOrder.create({
      data: {
        soNumber,
        quotationId: quotation.id,
        productId: line.productId,
        quantity: line.quantity,
        colourId: line.colourId,
        priority,
        status: "pending_verification",
        customerName,
      },
    });
    if (!firstSoId) firstSoId = so.id;

    await notify({
      type: "sales_order_confirmed",
      dedupeKey: `sales_order_confirmed:${so.id}`,
      salesOrderId: so.id,
      directory,
      context: {
        soNumber,
        productName: line.productName,
        quantity: line.quantity,
        colourName: line.colourName,
        status: "Pending verification",
        priority,
        requiredAction: "Verify item code, drawing, BOM and order details, then approve & release.",
        dashboardUrl: dashboardLink(`/sales-orders/${so.id}`),
      },
    });
    await notify({
      type: "sales_coordinator_approval",
      dedupeKey: `sales_coordinator_approval:${so.id}`,
      salesOrderId: so.id,
      directory,
      context: {
        soNumber,
        productName: line.productName,
        quantity: line.quantity,
        colourName: line.colourName,
        status: "Awaiting coordinator approval",
        priority,
        requiredAction: "Complete verification checklist and approve & release to OC.",
        dashboardUrl: dashboardLink(`/sales-orders/${so.id}`),
      },
    });
  }

  revalidatePath("/sales-orders");
  revalidatePath("/alerts");
  revalidatePath("/");
  return firstSoId;
}

export async function createSalesOrderManual(input: {
  productId: string;
  quantity: number;
  colourId: string;
  priority?: Priority;
  customerName?: string;
}) {
  await requireRole("MANAGER");
  const [product, colour, directory] = await Promise.all([
    prisma.product.findUniqueOrThrow({ where: { id: input.productId } }),
    prisma.colour.findUniqueOrThrow({ where: { id: input.colourId } }),
    getContactDirectory(),
  ]);

  const soNumber = await nextSoNumber();
  const so = await prisma.salesOrder.create({
    data: {
      soNumber,
      productId: input.productId,
      quantity: input.quantity,
      colourId: input.colourId,
      priority: input.priority && isPriority(input.priority) ? input.priority : "NORMAL",
      status: "pending_verification",
      customerName: input.customerName?.trim() ?? "",
    },
  });

  await notify({
    type: "sales_order_confirmed",
    dedupeKey: `sales_order_confirmed:${so.id}`,
    salesOrderId: so.id,
    directory,
    context: {
      soNumber,
      productName: product.name,
      quantity: input.quantity,
      colourName: colour.name,
      status: "Pending verification",
      priority: so.priority,
      requiredAction: "Verify item code, drawing, BOM and order details, then approve & release.",
      dashboardUrl: dashboardLink(`/sales-orders/${so.id}`),
    },
  });
  await notify({
    type: "sales_coordinator_approval",
    dedupeKey: `sales_coordinator_approval:${so.id}`,
    salesOrderId: so.id,
    directory,
    context: {
      soNumber,
      productName: product.name,
      quantity: input.quantity,
      colourName: colour.name,
      status: "Awaiting coordinator approval",
      priority: so.priority,
      requiredAction: "Complete verification checklist and approve & release to OC.",
      dashboardUrl: dashboardLink(`/sales-orders/${so.id}`),
    },
  });

  revalidatePath("/sales-orders");
  revalidatePath("/alerts");
  revalidatePath("/");
  return so.id;
}

export async function updateSalesOrderVerification(input: {
  id: string;
  itemCodeVerified: boolean;
  drawingVerified: boolean;
  bomVerified: boolean;
  orderDetailsVerified: boolean;
  notes?: string;
}) {
  await requireRole("MANAGER");
  await prisma.salesOrder.update({
    where: { id: input.id },
    data: {
      itemCodeVerified: input.itemCodeVerified,
      drawingVerified: input.drawingVerified,
      bomVerified: input.bomVerified,
      orderDetailsVerified: input.orderDetailsVerified,
      notes: input.notes?.trim() ?? undefined,
    },
  });
  revalidatePath(`/sales-orders/${input.id}`);
  revalidatePath("/sales-orders");
}

export async function approveSalesOrder(id: string) {
  await requireRole("MANAGER");
  const so = await prisma.salesOrder.findUniqueOrThrow({ where: { id } });
  if (so.status === "released" || so.status === "rejected") {
    throw new Error("This sales order can no longer be approved.");
  }
  if (!so.itemCodeVerified || !so.drawingVerified || !so.bomVerified || !so.orderDetailsVerified) {
    throw new Error("Complete all verification checks before approving.");
  }
  await prisma.salesOrder.update({
    where: { id },
    data: { status: "approved", verifiedAt: new Date() },
  });
  revalidatePath(`/sales-orders/${id}`);
  revalidatePath("/sales-orders");
}

export async function sendBackSalesOrder(input: { id: string; reason: string }) {
  await requireRole("MANAGER");
  await prisma.salesOrder.update({
    where: { id: input.id },
    data: {
      status: "sent_back",
      sendBackReason: input.reason.trim(),
      itemCodeVerified: false,
      drawingVerified: false,
      bomVerified: false,
      orderDetailsVerified: false,
    },
  });
  revalidatePath(`/sales-orders/${input.id}`);
  revalidatePath("/sales-orders");
}

export async function rejectSalesOrder(input: { id: string; reason: string }) {
  await requireRole("MANAGER");
  await prisma.salesOrder.update({
    where: { id: input.id },
    data: { status: "rejected", rejectReason: input.reason.trim() },
  });
  revalidatePath(`/sales-orders/${input.id}`);
  revalidatePath("/sales-orders");
}

/** Approve verification (if needed) and release to production as an OC. */
export async function approveAndReleaseSalesOrder(input: {
  id: string;
  targetDays: number;
  ocNumber?: string;
}) {
  await requireRole("MANAGER");
  const so = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: input.id },
    include: { orderConfirmation: true },
  });
  if (so.orderConfirmation) throw new Error("This sales order already has an OC.");
  if (so.status === "rejected") throw new Error("Cannot release a rejected sales order.");
  if (!so.itemCodeVerified || !so.drawingVerified || !so.bomVerified || !so.orderDetailsVerified) {
    throw new Error("Complete all verification checks before release.");
  }

  if (so.status !== "approved") {
    await prisma.salesOrder.update({
      where: { id: so.id },
      data: { status: "approved", verifiedAt: new Date() },
    });
  }

  const ocId = await createOrder({
    productId: so.productId,
    quantity: so.quantity,
    colourId: so.colourId,
    targetDays: input.targetDays,
    ocNumber: input.ocNumber,
    priority: isPriority(so.priority) ? so.priority : "NORMAL",
    salesOrderId: so.id,
  });

  await prisma.salesOrder.update({
    where: { id: so.id },
    data: { status: "released", releasedAt: new Date() },
  });

  revalidatePath(`/sales-orders/${so.id}`);
  revalidatePath("/sales-orders");
  revalidatePath("/orders");
  revalidatePath("/");
  return ocId;
}

export async function sendStageReminder(ocId: string) {
  await requireRole("MANAGER");
  const [oc, directory] = await Promise.all([
    prisma.orderConfirmation.findUniqueOrThrow({
      where: { id: ocId },
      include: { product: true, colour: true },
    }),
    getContactDirectory(),
  ]);
  if (oc.status === "closed" || oc.status === "cancelled") {
    throw new Error("Cannot remind on a closed or cancelled OC.");
  }
  // Deliberate reminder — unique per trigger time so managers can re-send
  await notify({
    type: "follow_up_reminder",
    dedupeKey: `follow_up_reminder:${oc.id}:${Date.now()}`,
    ocId: oc.id,
    stageName: oc.currentStage,
    directory,
    context: {
      ocNumber: oc.ocNumber,
      productName: oc.product.name,
      quantity: oc.quantity,
      colourName: oc.colour.name,
      currentStage: oc.currentStage,
      status: "Follow-up pending",
      priority: oc.priority,
      requiredAction: "Update progress or advance the stage when ready.",
      dashboardUrl: dashboardLink(`/orders/${oc.id}`),
    },
  });
  revalidatePath("/alerts");
  revalidatePath("/follow-up");
}

export async function escalateStage(ocId: string) {
  await requireRole("MANAGER");
  const [oc, directory] = await Promise.all([
    prisma.orderConfirmation.findUniqueOrThrow({
      where: { id: ocId },
      include: { product: true, colour: true },
    }),
    getContactDirectory(),
  ]);
  if (oc.status === "closed" || oc.status === "cancelled") {
    throw new Error("Cannot escalate a closed or cancelled OC.");
  }
  await notify({
    type: "escalation",
    dedupeKey: `escalation:${oc.id}:${Date.now()}`,
    ocId: oc.id,
    stageName: oc.currentStage,
    directory,
    context: {
      ocNumber: oc.ocNumber,
      productName: oc.product.name,
      quantity: oc.quantity,
      colourName: oc.colour.name,
      currentStage: oc.currentStage,
      status: "Escalated",
      priority: oc.priority,
      requiredAction: "Review and advise next steps.",
      dashboardUrl: dashboardLink(`/orders/${oc.id}`),
    },
  });
  revalidatePath("/alerts");
  revalidatePath("/follow-up");
}

export async function markFollowUpNoted(ocId: string) {
  await requireRole("MANAGER");
  const session = await getSession();
  const oc = await prisma.orderConfirmation.findUniqueOrThrow({
    where: { id: ocId },
    include: { product: true },
  });
  await prisma.alert.create({
    data: {
      ocId: oc.id,
      type: "follow_up_reminder",
      recipient: session?.name ?? "Manager",
      recipientEmail: session?.email ?? "",
      subject: `${oc.ocNumber} — follow-up marked complete`,
      body: `Follow-up on ${oc.ocNumber} (${oc.product.name}, stage ${oc.currentStage}) marked complete by ${session?.name ?? "manager"}.`,
      emailSent: false,
      emailStatus: "disabled",
      emailError: "Internal note — no email",
      dedupeKey: `follow_up_noted:${oc.id}:${Date.now()}`,
    },
  });
  revalidatePath("/alerts");
  revalidatePath("/follow-up");
}
