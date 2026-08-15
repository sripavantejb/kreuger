// Real SMTP sending — off by default (BUILD_SPEC.md § Email). Every
// notification is always written to the Alert table regardless; this only
// additionally relays it over SMTP when explicitly enabled via env.
// Never enabled in the seed script or tests.

import { prisma } from "./prisma";

type AlertLike = {
  id: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

function emailEnabled(): boolean {
  return process.env.ENABLE_EMAIL === "true" && !!process.env.SMTP_HOST;
}

export async function maybeSendAlertEmail(alert: AlertLike): Promise<void> {
  if (!emailEnabled() || !alert.recipientEmail) return;

  try {
    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });

    await transport.sendMail({
      from: process.env.SMTP_FROM || "Kreuger Ops <noreply@kreuger.local>",
      to: alert.recipientEmail,
      subject: alert.subject,
      text: alert.body,
    });

    await prisma.alert.update({ where: { id: alert.id }, data: { emailSent: true } });
  } catch (err) {
    console.error("Failed to send alert email:", err);
  }
}
