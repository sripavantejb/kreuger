"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { buildStageList, nextStage, FINISHED_GOODS_STAGE } from "./stages";
import { getContactDirectory, notify, dashboardLink } from "./alerts";
import { requireRole, getSession } from "./auth";
import { formatDate } from "./format";
import { headForStage } from "./plant-heads";
import { contactForStage } from "./notification-routing";

function revalidateStagePaths(ocId: string) {
  revalidatePath(`/orders/${ocId}`);
  revalidatePath("/orders");
  revalidatePath("/alerts");
  revalidatePath("/follow-up");
  revalidatePath("/tasks");
  revalidatePath("/approvals");
  revalidatePath("/");
}

/**
 * Core stage advance — used by admin force-advance and head approval.
 */
export async function executeStageAdvance(ocId: string, actor: string) {
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
  if (oc.status === "closed") throw new Error("Order is already closed.");

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
    data: {
      exitedAt: now,
      durationHours: elapsedHours,
      breached,
      updatedBy: actor || openEvent.updatedBy,
    },
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
      followUpClearedStage: "",
    },
  });

  await prisma.followUpReminder.updateMany({
    where: { ocId: oc.id, stageName: openEvent.stageName, status: "scheduled" },
    data: { status: "skipped" },
  });

  await prisma.stageChangeRequest.updateMany({
    where: { ocId: oc.id, status: "pending" },
    data: { status: "cancelled", reviewNote: "Superseded by stage advance" },
  });

  revalidateStagePaths(ocId);
  return { from: openEvent.stageName, to: next };
}

/** Admin bypass — advance immediately without plant-head approval. */
export async function forceAdvanceStage(ocId: string) {
  await requireRole("ADMIN");
  const session = await getSession();
  await executeStageAdvance(ocId, session?.name ?? "Admin");
}

/** @deprecated Prefer forceAdvanceStage (admin) or requestStageAdvance. Kept for ADMIN UI. */
export async function advanceStage(ocId: string) {
  return forceAdvanceStage(ocId);
}

/** Manager / Head — request stage change; plant head must approve. */
export async function requestStageAdvance(
  ocId: string,
  note = ""
): Promise<{ ok: true; requestId: string } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    const [oc, departments, directory] = await Promise.all([
      prisma.orderConfirmation.findUniqueOrThrow({
        where: { id: ocId },
        include: { product: true, colour: true },
      }),
      prisma.department.findMany({ orderBy: { sequence: "asc" } }),
      getContactDirectory(),
    ]);

    if (oc.status !== "in_progress") {
      return { ok: false, error: "Only in-progress OCs can request a stage change." };
    }

    const existing = await prisma.stageChangeRequest.findFirst({
      where: { ocId: oc.id, status: "pending" },
    });
    if (existing) {
      return { ok: false, error: "A stage-change request is already pending for this OC." };
    }

    const stageList = buildStageList(departments.map((d) => d.name));
    const next = nextStage(stageList, oc.currentStage);
    if (!next) return { ok: false, error: "Order is already at the terminal stage." };

    const req = await prisma.stageChangeRequest.create({
      data: {
        ocId: oc.id,
        fromStage: oc.currentStage,
        toStage: next,
        status: "pending",
        requestedBy: session.name,
        requestedByEmail: session.email,
        note: note.trim().slice(0, 500),
      },
    });

    const head = headForStage(oc.currentStage, directory);
    const contact = head
      ? { name: head.name, email: head.email }
      : contactForStage(oc.currentStage, directory);

    await notify({
      type: "follow_up_reminder",
      dedupeKey: `stage_change_request:${req.id}`,
      ocId: oc.id,
      stageName: oc.currentStage,
      directory,
      context: {
        ocNumber: oc.ocNumber,
        productName: oc.product.name,
        quantity: oc.quantity,
        colourName: oc.colour.name,
        currentStage: oc.currentStage,
        status: `Stage change requested → ${next}`,
        priority: oc.priority,
        requiredAction: `Approve or reject on /approvals.${note ? ` Note: ${note}` : ""} Approver: ${contact.name}.`,
        dashboardUrl: dashboardLink(`/approvals`),
      },
    });

    revalidateStagePaths(ocId);
    return { ok: true, requestId: req.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not request stage change." };
  }
}

export async function approveStageChange(
  requestId: string,
  reviewNote = ""
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    if (session.role === "MANAGER") {
      return { ok: false, error: "Stage changes must be approved by a plant / department head." };
    }

    const req = await prisma.stageChangeRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { oc: true },
    });
    if (req.status !== "pending") {
      return { ok: false, error: "This request is no longer pending." };
    }
    if (req.oc.currentStage !== req.fromStage) {
      await prisma.stageChangeRequest.update({
        where: { id: req.id },
        data: { status: "cancelled", reviewNote: "Stage already changed" },
      });
      return { ok: false, error: "OC stage has already changed — request cancelled." };
    }

    await executeStageAdvance(req.ocId, session.name);

    await prisma.stageChangeRequest.update({
      where: { id: req.id },
      data: {
        status: "approved",
        reviewedBy: session.name,
        reviewedByEmail: session.email,
        reviewedAt: new Date(),
        reviewNote: reviewNote.trim().slice(0, 500),
      },
    });

    revalidateStagePaths(req.ocId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Approval failed." };
  }
}

export async function rejectStageChange(
  requestId: string,
  reviewNote = ""
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    if (session.role === "MANAGER") {
      return { ok: false, error: "Stage changes must be reviewed by a plant / department head." };
    }
    const req = await prisma.stageChangeRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (req.status !== "pending") {
      return { ok: false, error: "This request is no longer pending." };
    }
    await prisma.stageChangeRequest.update({
      where: { id: req.id },
      data: {
        status: "rejected",
        reviewedBy: session.name,
        reviewedByEmail: session.email,
        reviewedAt: new Date(),
        reviewNote: reviewNote.trim().slice(0, 500) || "Rejected",
      },
    });
    revalidateStagePaths(req.ocId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rejection failed." };
  }
}

export async function cancelStageChangeRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    const req = await prisma.stageChangeRequest.findUniqueOrThrow({ where: { id: requestId } });
    if (req.status !== "pending") {
      return { ok: false, error: "Only pending requests can be cancelled." };
    }
    const canCancel =
      session.role === "ADMIN" ||
      session.role === "MANAGER" ||
      req.requestedByEmail.toLowerCase() === session.email.toLowerCase();
    if (!canCancel) {
      return { ok: false, error: "You can only cancel requests you created." };
    }
    await prisma.stageChangeRequest.update({
      where: { id: req.id },
      data: { status: "cancelled", reviewNote: `Cancelled by ${session.name}` },
    });
    revalidateStagePaths(req.ocId);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Cancel failed." };
  }
}
