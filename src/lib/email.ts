// Real SMTP sending — off by default. Alerts are always stored in the DB;
// this module only relays them when ENABLE_EMAIL=true and SMTP/Gmail is configured.
//
// Gmail setup (recommended for demo):
//   ENABLE_EMAIL=true
//   SMTP_HOST=smtp.gmail.com
//   SMTP_PORT=587
//   SMTP_USER=your.name@gmail.com
//   SMTP_PASS=<16-char Google App Password>
//   SMTP_FROM="Kreuger Ops <your.name@gmail.com>"
//   ALERT_GMAIL=your.name@gmail.com   # optional: override all alert recipients for testing

import { prisma } from "./prisma";

type AlertLike = {
  id: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

function emailEnabled(): boolean {
  if (process.env.ENABLE_EMAIL !== "true") return false;
  const host = process.env.SMTP_HOST || (process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  return Boolean(host && user && pass);
}

function resolveSmtp() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || "";
  const host = process.env.SMTP_HOST || (user.includes("@gmail.com") || process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return { user, pass, host, port, secure: port === 465 };
}

/** Optional demo override so every alert lands in one Gmail inbox. */
export function resolveAlertRecipientEmail(configuredEmail: string): string {
  const override = process.env.ALERT_GMAIL?.trim();
  if (override) return override;
  return configuredEmail;
}

export async function maybeSendAlertEmail(alert: AlertLike): Promise<void> {
  const to = resolveAlertRecipientEmail(alert.recipientEmail);
  if (!emailEnabled() || !to) {
    if (process.env.ENABLE_EMAIL === "true" && !to) {
      console.warn(`Alert ${alert.id} skipped: no recipient email`);
    }
    return;
  }

  try {
    const nodemailer = await import("nodemailer");
    const smtp = resolveSmtp();
    const transport = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: { user: smtp.user, pass: smtp.pass },
    });

    const from =
      process.env.SMTP_FROM ||
      `Kreuger Ops <${smtp.user}>`;

    await transport.sendMail({
      from,
      to,
      subject: alert.subject,
      text: `${alert.body}\n\n—\nKreuger Ops alert for ${alert.recipient}${
        process.env.ALERT_GMAIL ? ` (delivered via ALERT_GMAIL override)` : ""
      }`,
      html: `<p>${alert.body.replace(/\n/g, "<br/>")}</p><hr/><p style="color:#666;font-size:12px">Kreuger Ops · intended for ${alert.recipient}</p>`,
    });

    await prisma.alert.update({ where: { id: alert.id }, data: { emailSent: true } });
  } catch (err) {
    console.error("Failed to send alert email:", err);
  }
}

/** Lightweight connectivity check used by Master Data / ops. */
export async function getEmailDeliveryStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  host: string;
  from: string;
  overrideTo: string | null;
}> {
  const smtp = resolveSmtp();
  return {
    enabled: process.env.ENABLE_EMAIL === "true",
    configured: emailEnabled(),
    host: smtp.host || "(not set)",
    from: process.env.SMTP_FROM || (smtp.user ? `Kreuger Ops <${smtp.user}>` : "(not set)"),
    overrideTo: process.env.ALERT_GMAIL?.trim() || null,
  };
}
