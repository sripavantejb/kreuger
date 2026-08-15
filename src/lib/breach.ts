// On-load breach detection — Scenario 4 of BUILD_SPEC.md.
// Called at the top of any page that reads OC state. Marks the current
// open stage as breached (and queues the escalation alert) the moment
// elapsed time exceeds the deadline, without waiting for "Advance".

import { prisma } from "./prisma";
import { buildDeadlineBreachAlert, getContactDirectory } from "./alerts";
import { FINISHED_GOODS_STAGE } from "./stages";
import { maybeSendAlertEmail } from "./email";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function syncBreaches(): Promise<void> {
  const openEvents = await prisma.ocStageEvent.findMany({
    where: { exitedAt: null, breached: false, stageName: { not: FINISHED_GOODS_STAGE } },
    include: { oc: { include: { product: true } } },
  });
  if (openEvents.length === 0) return;

  const directory = await getContactDirectory();
  const now = Date.now();
  for (const ev of openEvents) {
    const elapsedDays = (now - ev.enteredAt.getTime()) / DAY_MS;
    if (elapsedDays > ev.deadlineDays) {
      await prisma.ocStageEvent.update({ where: { id: ev.id }, data: { breached: true } });
      const alertData = buildDeadlineBreachAlert({
        ocNumber: ev.oc.ocNumber,
        productName: ev.oc.product.name,
        quantity: ev.oc.quantity,
        stageName: ev.stageName,
        deadlineDays: ev.deadlineDays,
        elapsedDays,
        directory,
      });
      const alert = await prisma.alert.create({ data: { ocId: ev.ocId, ...alertData } });
      await maybeSendAlertEmail(alert);
    }
  }
}
