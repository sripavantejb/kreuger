// SMTP delivery — credentials only from env. Alerts always persist via notify().
//
// ENABLE_EMAIL=true
// SMTP_HOST=smtp.gmail.com
// SMTP_PORT=587
// SMTP_USER=...
// SMTP_PASS=...   (or SMTP_PASSWORD / GMAIL_APP_PASSWORD)
// SMTP_FROM="Kreuger Ops <...>"

export function isEmailSendingEnabled(): boolean {
  return process.env.ENABLE_EMAIL === "true";
}

export function smtpConfigured(): boolean {
  const { host, user, pass } = resolveSmtp();
  return Boolean(host && user && pass);
}

function resolveSmtp() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || "";
  const pass =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD ||
    process.env.GMAIL_APP_PASSWORD ||
    "";
  const host =
    process.env.SMTP_HOST ||
    (user.includes("@gmail.com") || process.env.GMAIL_USER ? "smtp.gmail.com" : "");
  const port = Number(process.env.SMTP_PORT ?? 587);
  return { user, pass, host, port, secure: port === 465 };
}

export async function deliverEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailSendingEnabled()) {
    return { ok: false, error: "ENABLE_EMAIL is false" };
  }
  if (!smtpConfigured()) {
    return { ok: false, error: "SMTP not configured" };
  }
  if (!input.to) {
    return { ok: false, error: "Missing recipient" };
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

    await transport.sendMail({
      from: process.env.SMTP_FROM || `Kreuger Ops <${smtp.user}>`,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html || undefined,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to send alert email:", message);
    return { ok: false, error: message };
  }
}

/** @deprecated Use notify() from notifications.ts */
export async function maybeSendAlertEmail(alert: {
  id: string;
  recipient: string;
  recipientEmail: string;
  subject: string;
  body: string;
  htmlBody?: string;
}): Promise<void> {
  const { prisma } = await import("./prisma");
  if (!isEmailSendingEnabled()) {
    await prisma.alert.update({
      where: { id: alert.id },
      data: { emailStatus: "disabled", emailError: "ENABLE_EMAIL is false", emailSent: false },
    });
    return;
  }
  if (!alert.recipientEmail || !smtpConfigured()) {
    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        emailStatus: "failed",
        emailError: !alert.recipientEmail ? "No recipient email" : "SMTP not configured",
        emailSent: false,
      },
    });
    return;
  }
  const result = await deliverEmail({
    to: alert.recipientEmail,
    subject: alert.subject,
    text: alert.body,
    html: alert.htmlBody,
  });
  await prisma.alert.update({
    where: { id: alert.id },
    data: result.ok
      ? { emailStatus: "sent", emailSent: true, emailSentAt: new Date(), emailError: "" }
      : { emailStatus: "failed", emailSent: false, emailError: result.error || "Send failed" },
  });
}

export async function getEmailDeliveryStatus(): Promise<{
  enabled: boolean;
  configured: boolean;
  host: string;
  from: string;
  overrideTo: string | null;
}> {
  const smtp = resolveSmtp();
  return {
    enabled: isEmailSendingEnabled(),
    configured: smtpConfigured(),
    host: smtp.host || "(not set)",
    from: process.env.SMTP_FROM || (smtp.user ? `Kreuger Ops <${smtp.user}>` : "(not set)"),
    overrideTo: null,
  };
}
