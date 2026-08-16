// Alert content builders — shared by the seed script and the "advance
// stage" action so notifications look identical regardless of where they
// were generated. Nothing here sends real email; see BUILD_SPEC.md § Email.
//
// Recipients are read from master data (Department.headName/headEmail and
// Settings' escalation contacts), never hardcoded, so editing a contact in
// Master Data > Recipients immediately changes who future alerts name.

import { FINISHED_GOODS_STAGE, PROCUREMENT_STAGE } from "./stages";
import { prisma } from "./prisma";

export type Contact = { name: string; email: string };
export type ContactDirectory = {
  procurement: Contact;
  dispatch: Contact;
  plantHead: Contact;
  salesCoordinator: Contact;
  departments: { name: string; headName: string; headEmail: string }[];
};

export async function getContactDirectory(): Promise<ContactDirectory> {
  const [settings, departments] = await Promise.all([
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.department.findMany(),
  ]);
  return {
    procurement: { name: settings.procurementHeadName, email: settings.procurementHeadEmail },
    dispatch: { name: settings.dispatchHeadName, email: settings.dispatchHeadEmail },
    plantHead: { name: settings.plantHeadName, email: settings.plantHeadEmail },
    salesCoordinator: {
      name: settings.salesCoordinatorName,
      email: settings.salesCoordinatorEmail,
    },
    departments: departments.map((d) => ({ name: d.name, headName: d.headName, headEmail: d.headEmail })),
  };
}

function contactForStage(stageName: string, dir: ContactDirectory): Contact {
  if (stageName === PROCUREMENT_STAGE) return dir.procurement;
  if (stageName === FINISHED_GOODS_STAGE) return dir.dispatch;
  const dept = dir.departments.find((d) => d.name === stageName);
  return dept ? { name: dept.headName || `${stageName} Head`, email: dept.headEmail } : { name: `${stageName} Head`, email: "" };
}

export function buildStageEntryAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  colourName: string;
  stageName: string;
  directory: ContactDirectory;
}) {
  const { ocNumber, productName, quantity, colourName, stageName, directory } = params;
  const contact = contactForStage(stageName, directory);
  return {
    type: "stage_entry" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: `${ocNumber} entered ${stageName}`,
    body: `Order ${ocNumber} (${productName}, ${quantity} units, ${colourName}) has entered ${stageName}. Please plan capacity and confirm receipt.`,
  };
}

export function buildDeadlineBreachAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  deadlineDays: number;
  elapsedDays: number;
  directory: ContactDirectory;
}) {
  const { ocNumber, productName, quantity, stageName, deadlineDays, elapsedDays, directory } = params;
  return {
    type: "deadline_breach" as const,
    recipient: directory.plantHead.name,
    recipientEmail: directory.plantHead.email,
    subject: `${ocNumber} — ${stageName} deadline breached`,
    body: `Order ${ocNumber} (${productName}, ${quantity} units) has exceeded its ${stageName} deadline of ${deadlineDays.toFixed(
      1
    )} day(s). Elapsed: ${elapsedDays.toFixed(1)} day(s). Please expedite and advise on a revised timeline.`,
  };
}

export function buildSalesOrderConfirmedAlert(params: {
  soNumber: string;
  productName: string;
  quantity: number;
  colourName: string;
  directory: ContactDirectory;
}) {
  const { soNumber, productName, quantity, colourName, directory } = params;
  return {
    type: "sales_order_confirmed" as const,
    recipient: directory.salesCoordinator.name,
    recipientEmail: directory.salesCoordinator.email,
    subject: `${soNumber} confirmed — verification required`,
    body: `Sales order ${soNumber} (${productName}, ${quantity} units, ${colourName}) has been confirmed. Please verify item code, drawing, BOM and order details before release to production.`,
  };
}

export function buildFollowUpReminderAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  directory: ContactDirectory;
}) {
  const { ocNumber, productName, quantity, stageName, directory } = params;
  const contact = contactForStage(stageName, directory);
  return {
    type: "follow_up_reminder" as const,
    recipient: contact.name,
    recipientEmail: contact.email,
    subject: `Reminder: ${ocNumber} still in ${stageName}`,
    body: `Follow-up reminder for ${ocNumber} (${productName}, ${quantity} units). Current stage: ${stageName}. Please update progress or advance when ready.`,
  };
}

export function buildEscalationAlert(params: {
  ocNumber: string;
  productName: string;
  quantity: number;
  stageName: string;
  directory: ContactDirectory;
}) {
  const { ocNumber, productName, quantity, stageName, directory } = params;
  return {
    type: "escalation" as const,
    recipient: directory.plantHead.name,
    recipientEmail: directory.plantHead.email,
    subject: `Escalation: ${ocNumber} — ${stageName}`,
    body: `Escalation raised for ${ocNumber} (${productName}, ${quantity} units) while in ${stageName}. Please review and advise.`,
  };
}
