import { prisma } from "./prisma";
import {
  renderEmailTemplate,
  type NotificationEventType,
  type TemplateContext,
} from "./email-templates";
import { resolveRecipient, type ContactDirectory } from "./notification-routing";
import { FINISHED_GOODS_STAGE, PROCUREMENT_STAGE } from "./stages";
import { deliverEmail, isEmailSendingEnabled, smtpConfigured } from "./email";

export type { ContactDirectory } from "./notification-routing";
export type { NotificationEventType, TemplateContext } from "./email-templates";

export async function getContactDirectory(): Promise<ContactDirectory> {
  const [settings, departments] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.department.findMany(),
  ]);

  const primary = {
    name: settings.primaryHeadName || settings.plantHeadName || "Primary Head",
    email: settings.primaryHeadEmail || settings.plantHeadEmail || "",
  };
  const secondary = {
    name: settings.secondaryHeadName || settings.salesCoordinatorName || "Secondary Head",
    email: settings.secondaryHeadEmail || settings.salesCoordinatorEmail || "",
  };

  return {
    primary,
    secondary,
    plantHead: primary,
    salesCoordinator: secondary,
    procurement: {
      name: settings.procurementHeadName,
      email: settings.procurementHeadEmail || secondary.email,
    },
    dispatch: {
      name: settings.dispatchHeadName,
      email: settings.dispatchHeadEmail || secondary.email,
    },
    departments: departments.map((d) => ({
      name: d.name,
      headName: d.headName,
      // Prefer department email; fall back to secondary so stage mail never goes nowhere
      headEmail: d.headEmail || secondary.email,
    })),
  };
}

function appBaseUrl(): string {
  return (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function dashboardLink(path: string): string {
  return `${appBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export type NotifyInput = {
  type: NotificationEventType;
  dedupeKey: string;
  context: TemplateContext;
  ocId?: string;
  salesOrderId?: string;
  stageName?: string;
  directory?: ContactDirectory;
};

/**
 * Create an Alert + EmailLog and attempt SMTP delivery when enabled.
 * Idempotent on dedupeKey — duplicate events do not re-send.
 * Always persists the Alert even if email fails or is disabled.
 */
export async function notify(input: NotifyInput): Promise<{ alertId: string; created: boolean }> {
  const existing = await prisma.alert.findUnique({ where: { dedupeKey: input.dedupeKey } });
  if (existing) {
    return { alertId: existing.id, created: false };
  }

  const directory = input.directory ?? (await getContactDirectory());
  const contact = resolveRecipient(input.type, directory, input.stageName);
  const tpl = renderEmailTemplate(input.type, {
    ...input.context,
    dashboardUrl:
      input.context.dashboardUrl ||
      (input.ocId
        ? dashboardLink(`/orders/${input.ocId}`)
        : input.salesOrderId
          ? dashboardLink(`/sales-orders/${input.salesOrderId}`)
          : dashboardLink("/alerts")),
  });

  const emailEnabled = isEmailSendingEnabled();
  const configured = smtpConfigured();
  let emailStatus: "pending" | "sent" | "failed" | "disabled" = "pending";
  let emailError = "";
  let emailSentAt: Date | null = null;

  if (!emailEnabled) {
    emailStatus = "disabled";
    emailError = "ENABLE_EMAIL is false — alert logged only";
  } else if (!configured) {
    emailStatus = "failed";
    emailError = "SMTP not configured (SMTP_HOST / SMTP_USER / SMTP_PASS)";
  } else if (!contact.email) {
    emailStatus = "failed";
    emailError = "No recipient email configured in Master Data";
  }

  const alert = await prisma.alert.create({
    data: {
      type: input.type,
      ocId: input.ocId,
      salesOrderId: input.salesOrderId,
      recipient: contact.name,
      recipientEmail: contact.email,
      subject: tpl.subject,
      body: tpl.text,
      htmlBody: tpl.html,
      dedupeKey: input.dedupeKey,
      emailStatus,
      emailSent: false,
      emailError,
      emailSentAt: null,
    },
  });

  const log = await prisma.emailLog.create({
    data: {
      alertId: alert.id,
      eventType: input.type,
      recipient: contact.name,
      recipientEmail: contact.email,
      subject: tpl.subject,
      body: tpl.text,
      ocId: input.ocId,
      salesOrderId: input.salesOrderId,
      dedupeKey: input.dedupeKey,
      status: emailStatus,
      errorMessage: emailError,
    },
  });

  if (emailStatus === "pending" && contact.email) {
    const result = await deliverEmail({
      to: contact.email,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html,
    });
    if (result.ok) {
      emailStatus = "sent";
      emailSentAt = new Date();
      emailError = "";
    } else {
      emailStatus = "failed";
      emailError = result.error || "SMTP send failed";
    }
    await Promise.all([
      prisma.alert.update({
        where: { id: alert.id },
        data: {
          emailStatus,
          emailSent: emailStatus === "sent",
          emailSentAt,
          emailError,
        },
      }),
      prisma.emailLog.update({
        where: { id: log.id },
        data: {
          status: emailStatus,
          sentAt: emailSentAt,
          errorMessage: emailError,
        },
      }),
    ]);
  }

  return { alertId: alert.id, created: true };
}

/** @deprecated Prefer notify() — kept for seed scripts that build plain text. */
export function buildStageEntryAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  colourName: string;
  stageName: string;
  directory: ContactDirectory;
}) {
  const contact = resolveRecipient("stage_entry", params.directory, params.stageName);
  const tpl = renderEmailTemplate("stage_entry", {
    ocNumber: params.ocNumber,
    productName: params.productName,
    quantity: params.quantity,
    colourName: params.colourName,
    currentStage: params.stageName,
    status: "In progress",
    requiredAction: "Plan capacity and confirm stage receipt.",
  });
  return {
    type: "stage_entry" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: tpl.subject,
    body: tpl.text,
  };
}

/** @deprecated Prefer notify() */
export function buildDeadlineBreachAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  deadlineDays: number;
  elapsedDays: number;
  directory: ContactDirectory;
}) {
  const contact = resolveRecipient("deadline_breach", params.directory, params.stageName);
  const tpl = renderEmailTemplate("deadline_breach", {
    ocNumber: params.ocNumber,
    productName: params.productName,
    quantity: params.quantity,
    currentStage: params.stageName,
    deadline: `${params.deadlineDays.toFixed(1)} day(s)`,
    status: `Breached — elapsed ${params.elapsedDays.toFixed(1)} day(s)`,
    requiredAction: "Expedite and advise on a revised timeline.",
  });
  return {
    type: "deadline_breach" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: tpl.subject,
    body: tpl.text,
  };
}

export function buildSalesOrderConfirmedAlert(params: {
  soNumber: string;
  productName: string;
  quantity: number;
  colourName: string;
  directory: ContactDirectory;
}) {
  const contact = resolveRecipient("sales_order_confirmed", params.directory);
  const tpl = renderEmailTemplate("sales_order_confirmed", {
    soNumber: params.soNumber,
    productName: params.productName,
    quantity: params.quantity,
    colourName: params.colourName,
    status: "Pending verification",
    requiredAction: "Verify item code, drawing, BOM and order details, then approve & release.",
  });
  return {
    type: "sales_order_confirmed" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: tpl.subject,
    body: tpl.text,
  };
}

export function buildFollowUpReminderAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  directory: ContactDirectory;
}) {
  const contact = resolveRecipient("follow_up_reminder", params.directory, params.stageName);
  const tpl = renderEmailTemplate("follow_up_reminder", {
    ocNumber: params.ocNumber,
    productName: params.productName,
    quantity: params.quantity,
    currentStage: params.stageName,
    status: "Follow-up pending",
    requiredAction: "Update progress or advance the stage when ready.",
  });
  return {
    type: "follow_up_reminder" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: tpl.subject,
    body: tpl.text,
  };
}

export function buildEscalationAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  directory: ContactDirectory;
}) {
  const contact = resolveRecipient("escalation", params.directory, params.stageName);
  const tpl = renderEmailTemplate("escalation", {
    ocNumber: params.ocNumber,
    productName: params.productName,
    quantity: params.quantity,
    currentStage: params.stageName,
    status: "Escalated",
    requiredAction: "Review and advise next steps.",
  });
  return {
    type: "escalation" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: tpl.subject,
    body: tpl.text,
  };
}

export { PROCUREMENT_STAGE, FINISHED_GOODS_STAGE };
