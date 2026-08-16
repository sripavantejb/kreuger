"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "./prisma";
import { requireRole, getSession } from "./auth";
import { listAssignableHeads } from "./plant-heads";
import { getContactDirectory, notify, dashboardLink } from "./alerts";
import { isPriority, type Priority } from "./priority";

export async function assignPlantTask(input: {
  title: string;
  description?: string;
  ocId?: string | null;
  assigneeKey: string;
  priority?: Priority;
  dueAtIso?: string | null;
  stageName?: string;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    const title = input.title.trim();
    if (!title) return { ok: false, error: "Title is required." };

    const heads = await listAssignableHeads();
    const head = heads.find((h) => h.key === input.assigneeKey);
    if (!head) return { ok: false, error: "Select a valid plant / department head." };

    let stageName = input.stageName?.trim() ?? "";
    let ocId = input.ocId || null;
    if (ocId) {
      const oc = await prisma.orderConfirmation.findUnique({ where: { id: ocId } });
      if (!oc) return { ok: false, error: "OC not found." };
      if (!stageName) stageName = oc.currentStage;
    }

    const dueAt = input.dueAtIso ? new Date(input.dueAtIso) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      return { ok: false, error: "Invalid due date." };
    }

    const priority = input.priority && isPriority(input.priority) ? input.priority : "NORMAL";

    const task = await prisma.plantTask.create({
      data: {
        title,
        description: (input.description ?? "").trim().slice(0, 2000),
        ocId,
        assigneeName: head.name,
        assigneeEmail: head.email,
        assigneeKey: head.key,
        stageName,
        priority,
        status: "open",
        dueAt: dueAt && !Number.isNaN(dueAt.getTime()) ? dueAt : null,
        createdBy: session.name,
        createdByEmail: session.email,
      },
    });

    const directory = await getContactDirectory();
    const oc = ocId
      ? await prisma.orderConfirmation.findUnique({
          where: { id: ocId },
          include: { product: true, colour: true },
        })
      : null;

    await notify({
      type: "follow_up_reminder",
      dedupeKey: `plant_task:${task.id}`,
      ocId: ocId ?? undefined,
      stageName: stageName || undefined,
      directory,
      context: {
        ocNumber: oc?.ocNumber ?? "—",
        productName: oc?.product.name ?? title,
        quantity: oc?.quantity ?? 0,
        colourName: oc?.colour.name ?? "",
        currentStage: stageName || "Task",
        status: `Task assigned: ${title}`,
        priority,
        requiredAction: `Open /tasks to update status.${input.description ? ` ${input.description.slice(0, 120)}` : ""}`,
        dashboardUrl: dashboardLink("/tasks"),
      },
    });

    revalidatePath("/tasks");
    revalidatePath("/follow-up");
    revalidatePath("/alerts");
    if (ocId) revalidatePath(`/orders/${ocId}`);
    return { ok: true, id: task.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not assign task." };
  }
}

export async function updatePlantTaskStatus(
  taskId: string,
  status: "open" | "in_progress" | "done" | "cancelled",
  completionNote = ""
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireRole("HEAD");
  try {
    const task = await prisma.plantTask.findUniqueOrThrow({ where: { id: taskId } });
    const isAssignee = task.assigneeEmail.toLowerCase() === session.email.toLowerCase();
    const isManagerPlus = session.role === "ADMIN" || session.role === "MANAGER" || session.role === "HEAD";
    if (!isAssignee && !isManagerPlus) {
      return { ok: false, error: "Only the assignee or a head/manager can update this task." };
    }

    await prisma.plantTask.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === "done" ? new Date() : null,
        completionNote: completionNote.trim().slice(0, 500),
      },
    });

    revalidatePath("/tasks");
    if (task.ocId) revalidatePath(`/orders/${task.ocId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not update task." };
  }
}

export async function getAssignableHeadsAction() {
  await requireRole("HEAD");
  return listAssignableHeads();
}
