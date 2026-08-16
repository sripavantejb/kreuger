// On-load breach / at-risk detection — Scenario 4.
// Called from pages that read OC state. Creates idempotent alerts only when
// thresholds are crossed (never on every refresh for the same event).

import { prisma } from "./prisma";
import { getContactDirectory, notify, dashboardLink } from "./alerts";
import { FINISHED_GOODS_STAGE } from "./stages";
import { formatDate } from "./format";

const DAY_MS = 24 * 60 * 60 * 1000;
const AT_RISK_RATIO = 0.8;

export async function syncBreaches(): Promise<void> {
  const openEvents = await prisma.ocStageEvent.findMany({
    where: { exitedAt: null, stageName: { not: FINISHED_GOODS_STAGE } },
    include: { oc: { include: { product: true, colour: true } } },
  });
  if (openEvents.length === 0) return;

  const directory = await getContactDirectory();
  const now = Date.now();

  for (const ev of openEvents) {
    if (ev.oc.status === "cancelled" || ev.oc.status === "closed") continue;
    const elapsedDays = (now - ev.enteredAt.getTime()) / DAY_MS;
    const deadline = ev.deadlineDays;

    if (elapsedDays > deadline) {
      if (!ev.breached) {
        await prisma.ocStageEvent.update({ where: { id: ev.id }, data: { breached: true } });
      }
      await notify({
        type: "deadline_breach",
        dedupeKey: `deadline_breach:${ev.ocId}:${ev.id}`,
        ocId: ev.ocId,
        stageName: ev.stageName,
        directory,
        context: {
          ocNumber: ev.oc.ocNumber,
          productName: ev.oc.product.name,
          quantity: ev.oc.quantity,
          colourName: ev.oc.colour.name,
          currentStage: ev.stageName,
          stageStartTime: formatDate(ev.enteredAt),
          expectedCompletion: formatDate(new Date(ev.enteredAt.getTime() + deadline * DAY_MS)),
          deadline: `${deadline.toFixed(1)} day(s)`,
          status: `Breached — elapsed ${elapsedDays.toFixed(1)} day(s)`,
          priority: ev.oc.priority,
          requiredAction: "Expedite and advise on a revised timeline.",
          dashboardUrl: dashboardLink(`/orders/${ev.ocId}`),
        },
      });

      // Overall OC target window: plannedAt + targetDays
      const overallDue = ev.oc.plannedAt.getTime() + ev.oc.targetDays * DAY_MS;
      if (now > overallDue) {
        await notify({
          type: "oc_deadline_breach",
          dedupeKey: `oc_deadline_breach:${ev.ocId}`,
          ocId: ev.ocId,
          directory,
          context: {
            ocNumber: ev.oc.ocNumber,
            productName: ev.oc.product.name,
            quantity: ev.oc.quantity,
            colourName: ev.oc.colour.name,
            currentStage: ev.stageName,
            deadline: formatDate(new Date(overallDue)),
            status: "Overall target deadline breached",
            priority: ev.oc.priority,
            requiredAction: "Escalate overall timeline with plant head.",
            dashboardUrl: dashboardLink(`/orders/${ev.ocId}`),
          },
        });
      }
    } else if (deadline > 0 && elapsedDays / deadline >= AT_RISK_RATIO) {
      await notify({
        type: "deadline_at_risk",
        dedupeKey: `deadline_at_risk:${ev.ocId}:${ev.id}`,
        ocId: ev.ocId,
        stageName: ev.stageName,
        directory,
        context: {
          ocNumber: ev.oc.ocNumber,
          productName: ev.oc.product.name,
          quantity: ev.oc.quantity,
          colourName: ev.oc.colour.name,
          currentStage: ev.stageName,
          stageStartTime: formatDate(ev.enteredAt),
          expectedCompletion: formatDate(new Date(ev.enteredAt.getTime() + deadline * DAY_MS)),
          deadline: `${deadline.toFixed(1)} day(s)`,
          status: `At risk — ${Math.round((elapsedDays / deadline) * 100)}% of stage deadline used`,
          priority: ev.oc.priority,
          requiredAction: "Chase stage progress before breach.",
          dashboardUrl: dashboardLink(`/orders/${ev.ocId}`),
        },
      });
    }
  }
}
