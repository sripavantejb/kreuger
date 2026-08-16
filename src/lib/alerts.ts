// Re-export notification helpers so existing imports from ./alerts keep working.
export {
  getContactDirectory,
  buildStageEntryAlert,
  buildDeadlineBreachAlert,
  buildSalesOrderConfirmedAlert,
  buildFollowUpReminderAlert,
  buildEscalationAlert,
  notify,
  dashboardLink,
  type ContactDirectory,
} from "./notifications";

export type { Contact } from "./notification-routing";
export { resolveRecipient, contactForStage, EVENT_RECIPIENT_ROLE } from "./notification-routing";
