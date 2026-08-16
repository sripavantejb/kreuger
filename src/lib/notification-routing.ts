import { FINISHED_GOODS_STAGE, PROCUREMENT_STAGE } from "./stages";
import type { NotificationEventType } from "./email-templates";

export type Contact = { name: string; email: string };

export type ContactDirectory = {
  primary: Contact;
  secondary: Contact;
  procurement: Contact;
  dispatch: Contact;
  plantHead: Contact;
  salesCoordinator: Contact;
  departments: { name: string; headName: string; headEmail: string }[];
};

/** Role used for MVP notification routing — stored recipients come from Settings. */
export type RecipientRole = "primary" | "secondary" | "department";

/**
 * Default MVP mapping (recipients themselves live in Master Data).
 * Change mapping here only if product rules change — not email addresses.
 */
export const EVENT_RECIPIENT_ROLE: Record<NotificationEventType, RecipientRole> = {
  sales_order_confirmed: "secondary",
  sales_coordinator_approval: "secondary",
  stage_entry: "department",
  follow_up_reminder: "department",
  deadline_at_risk: "secondary",
  deadline_breach: "primary",
  material_shortage: "secondary",
  urgent_order: "primary",
  oc_completed: "secondary",
  oc_deadline_breach: "primary",
  escalation: "primary",
};

export function contactForStage(stageName: string, dir: ContactDirectory): Contact {
  if (stageName === PROCUREMENT_STAGE) {
    return dir.procurement.email ? dir.procurement : dir.secondary;
  }
  if (stageName === FINISHED_GOODS_STAGE) {
    return dir.dispatch.email ? dir.dispatch : dir.secondary;
  }
  const dept = dir.departments.find((d) => d.name === stageName);
  if (dept?.headEmail) {
    return { name: dept.headName || `${stageName} Head`, email: dept.headEmail };
  }
  return dir.secondary;
}

export function resolveRecipient(
  type: NotificationEventType,
  dir: ContactDirectory,
  stageName?: string
): Contact {
  const role = EVENT_RECIPIENT_ROLE[type];
  if (role === "primary") return dir.primary.email ? dir.primary : dir.plantHead;
  if (role === "secondary") return dir.secondary.email ? dir.secondary : dir.salesCoordinator;
  return contactForStage(stageName || "", dir);
}
