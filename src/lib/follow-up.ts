import { prisma } from "@/lib/prisma";
import { getContactDirectory } from "@/lib/alerts";
import { notify, dashboardLink } from "@/lib/notifications";

/**
 * Send any scheduled follow-up reminders that are due.
 * Safe to call on page load — skips closed OCs and stage mismatches.
 */
export async function processDueFollowUpReminders(): Promise<{ sent: number; skipped: number }> {
  const now = new Date();
  const due = await prisma.followUpReminder.findMany({
    where: {
      status: "scheduled",
      scheduledAt: { lte: now },
    },
    include: {
      oc: { include: { product: true, colour: true } },
    },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  let sent = 0;
  let skipped = 0;
  const directory = await getContactDirectory();

  for (const reminder of due) {
    const oc = reminder.oc;
    if (
      oc.status === "closed" ||
      oc.status === "cancelled" ||
      oc.currentStage !== reminder.stageName
    ) {
      await prisma.followUpReminder.update({
        where: { id: reminder.id },
        data: { status: "skipped" },
      });
      skipped += 1;
      continue;
    }

    const noteSuffix = reminder.note?.trim()
      ? ` Note: ${reminder.note.trim()}`
      : "";

    const result = await notify({
      type: "follow_up_reminder",
      dedupeKey: `follow_up_scheduled:${reminder.id}`,
      ocId: oc.id,
      stageName: oc.currentStage,
      directory,
      context: {
        ocNumber: oc.ocNumber,
        productName: oc.product.name,
        quantity: oc.quantity,
        colourName: oc.colour.name,
        currentStage: oc.currentStage,
        status: "Scheduled follow-up due",
        priority: oc.priority,
        requiredAction: `Update progress or advance the stage when ready.${noteSuffix}`,
        dashboardUrl: dashboardLink(`/orders/${oc.id}`),
      },
    });

    await prisma.followUpReminder.update({
      where: { id: reminder.id },
      data: {
        status: "sent",
        sentAt: new Date(),
        alertId: result.alertId,
      },
    });
    sent += 1;
  }

  return { sent, skipped };
}
