import { COMPANY } from "@/lib/brand";

export type NotificationEventType =
  | "sales_order_confirmed"
  | "sales_coordinator_approval"
  | "stage_entry"
  | "follow_up_reminder"
  | "deadline_at_risk"
  | "deadline_breach"
  | "material_shortage"
  | "urgent_order"
  | "oc_completed"
  | "oc_deadline_breach"
  | "escalation";

export type TemplateContext = {
  appName?: string;
  soNumber?: string;
  ocNumber?: string;
  productName?: string;
  quantity?: number;
  colourName?: string;
  currentStage?: string;
  previousStage?: string;
  status?: string;
  deadline?: string;
  stageStartTime?: string;
  expectedCompletion?: string;
  requiredAction?: string;
  dashboardUrl?: string;
  materialsSummary?: string;
  priority?: string;
  extraNote?: string;
};

function lines(parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join("\n");
}

function htmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function row(label: string, value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";
  return `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${htmlEscape(label)}</td><td style="padding:4px 0;font-weight:600">${htmlEscape(String(value))}</td></tr>`;
}

export function renderEmailTemplate(
  type: NotificationEventType,
  ctx: TemplateContext
): { subject: string; text: string; html: string } {
  const app = ctx.appName || COMPANY.shortName || "Kreuger Ops";
  const ref = ctx.ocNumber || ctx.soNumber || "—";
  const action = ctx.requiredAction || "Please review in the dashboard.";
  const link = ctx.dashboardUrl || "";

  const subjects: Record<NotificationEventType, string> = {
    sales_order_confirmed: `${ctx.soNumber} confirmed — verification required`,
    sales_coordinator_approval: `${ctx.soNumber} — sales coordinator approval required`,
    stage_entry: `${ctx.ocNumber} — ${ctx.productName || "order"} entered ${ctx.currentStage}`,
    follow_up_reminder: `Follow-up reminder: ${ctx.ocNumber} · ${ctx.currentStage}`,
    deadline_at_risk: `${ctx.ocNumber} — ${ctx.currentStage} deadline at risk`,
    deadline_breach: `${ctx.ocNumber} — ${ctx.currentStage} deadline breached`,
    material_shortage: `${ctx.ocNumber} — material shortage`,
    urgent_order: `URGENT: ${ctx.ocNumber || ctx.soNumber} · ${ctx.priority || "HIGH"} priority`,
    oc_completed: `${ctx.ocNumber} completed — Finished goods`,
    oc_deadline_breach: `${ctx.ocNumber} — overall target deadline breached`,
    escalation: `Escalation: ${ctx.ocNumber} — ${ctx.currentStage}`,
  };

  const text = lines([
    `${app}`,
    "",
    subjects[type],
    "",
    ctx.soNumber && `Sales order: ${ctx.soNumber}`,
    ctx.ocNumber && `OC number: ${ctx.ocNumber}`,
    ctx.productName && `Product: ${ctx.productName}`,
    ctx.quantity != null && `Quantity: ${ctx.quantity}`,
    ctx.colourName && `Colour: ${ctx.colourName}`,
    ctx.priority && `Priority: ${ctx.priority}`,
    ctx.previousStage && `Previous stage: ${ctx.previousStage}`,
    ctx.currentStage && `Current stage: ${ctx.currentStage}`,
    ctx.stageStartTime && `Stage start: ${ctx.stageStartTime}`,
    ctx.expectedCompletion && `Expected completion: ${ctx.expectedCompletion}`,
    ctx.deadline && `Deadline: ${ctx.deadline}`,
    ctx.status && `Status: ${ctx.status}`,
    ctx.materialsSummary && `Materials: ${ctx.materialsSummary}`,
    ctx.extraNote && ctx.extraNote,
    "",
    `Required action: ${action}`,
    link && `Dashboard: ${link}`,
    "",
    `— ${app}`,
  ]);

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;color:#222;line-height:1.45">
  <p style="font-size:13px;color:#666;margin:0 0 12px">${htmlEscape(app)}</p>
  <h2 style="font-size:18px;margin:0 0 16px">${htmlEscape(subjects[type])}</h2>
  <table style="border-collapse:collapse;font-size:14px">
    ${row("Sales order", ctx.soNumber)}
    ${row("OC number", ctx.ocNumber)}
    ${row("Product", ctx.productName)}
    ${row("Quantity", ctx.quantity)}
    ${row("Colour", ctx.colourName)}
    ${row("Priority", ctx.priority)}
    ${row("Previous stage", ctx.previousStage)}
    ${row("Current stage", ctx.currentStage)}
    ${row("Stage start", ctx.stageStartTime)}
    ${row("Expected completion", ctx.expectedCompletion)}
    ${row("Deadline", ctx.deadline)}
    ${row("Status", ctx.status)}
    ${row("Materials", ctx.materialsSummary)}
  </table>
  ${ctx.extraNote ? `<p style="margin-top:12px">${htmlEscape(ctx.extraNote)}</p>` : ""}
  <p style="margin-top:16px"><strong>Required action:</strong> ${htmlEscape(action)}</p>
  ${link ? `<p><a href="${htmlEscape(link)}">Open in dashboard</a></p>` : ""}
  <hr style="border:none;border-top:1px solid #ddd;margin:20px 0"/>
  <p style="font-size:12px;color:#888">${htmlEscape(app)} · Ref ${htmlEscape(ref)}</p>
</body></html>`;

  return { subject: subjects[type], text, html };
}
