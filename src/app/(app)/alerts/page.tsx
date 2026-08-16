import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { AlertTriangle, Mail, BellRing, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import { getEmailDeliveryStatus } from "@/lib/email";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const TYPE_OPTIONS = [
  { value: "stage_entry", label: "Stage entry" },
  { value: "deadline_at_risk", label: "Deadline at risk" },
  { value: "deadline_breach", label: "Deadline breach" },
  { value: "oc_deadline_breach", label: "OC deadline breach" },
  { value: "sales_order_confirmed", label: "Sales order confirmed" },
  { value: "sales_coordinator_approval", label: "Coordinator approval" },
  { value: "follow_up_reminder", label: "Follow-up reminder" },
  { value: "material_shortage", label: "Material shortage" },
  { value: "urgent_order", label: "Urgent order" },
  { value: "oc_completed", label: "OC completed" },
  { value: "escalation", label: "Escalation" },
];

function typeLabel(type: string) {
  return TYPE_OPTIONS.find((t) => t.value === type)?.label ?? type.replaceAll("_", " ");
}

function EmailStatusBadge({ status }: { status: string }) {
  if (status === "sent") {
    return (
      <Badge variant="outline" className="border-transparent bg-[var(--status-ok-bg)] text-[var(--status-ok)] gap-1">
        <CheckCircle2 className="size-3" /> Email sent
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge variant="outline" className="border-transparent bg-[var(--status-breach-bg)] text-[var(--status-breach)] gap-1">
        <XCircle className="size-3" /> Email delivery failed
      </Badge>
    );
  }
  if (status === "disabled") {
    return (
      <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground gap-1">
        <Mail className="size-3" /> Email disabled
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-transparent bg-amber-50 text-amber-800 gap-1">
      <Clock className="size-3" /> Email pending
    </Badge>
  );
}

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await syncBreaches();
  const [{ q, filter }, emailStatus] = await Promise.all([searchParams, getEmailDeliveryStatus()]);

  const where: Prisma.AlertWhereInput = {
    ...(filter && filter !== "all" ? { type: filter } : {}),
    ...(q
      ? {
          OR: [
            { subject: { contains: q, mode: "insensitive" } },
            { recipient: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const alerts = await prisma.alert.findMany({
    where,
    include: { oc: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const csvRows = alerts.map((a) => ({
    Type: a.type,
    To: a.recipient,
    Email: a.recipientEmail,
    Subject: a.subject,
    "Email status": a.emailStatus,
    "Email error": a.emailError,
    OC: a.oc?.ocNumber ?? "",
    Date: formatDateTime(a.createdAt),
  }));

  return (
    <div>
      <PageHeader
        title="Alerts"
        description={
          emailStatus.configured
            ? `Inbox log + SMTP delivery on (${emailStatus.host}). Status shown per alert.`
            : emailStatus.enabled
              ? "ENABLE_EMAIL is on but SMTP credentials are incomplete — alerts stay in this log with Failed status."
              : "Alerts are always logged here. Set ENABLE_EMAIL=true and SMTP in .env to also email Primary/Secondary heads."
        }
        help={{
          content: (
            <>
              <p>Recipients come from Master Data → Recipients (Primary / Secondary heads). Never hardcoded in UI logic.</p>
              <ul>
                <li><strong>Primary</strong> — deadline breach, OC deadline, urgent, escalation</li>
                <li><strong>Secondary</strong> — SO confirmed, coordinator approval, at-risk, shortage, follow-up fallback</li>
                <li><strong>Department</strong> — stage entry (falls back to Secondary)</li>
              </ul>
            </>
          ),
        }}
      />
      <PageBody narrow>
        <ListToolbar searchPlaceholder="Search alerts…" filterOptions={TYPE_OPTIONS} filterLabel="All types">
          <ExportCsvButton filename="alerts.csv" rows={csvRows} />
        </ListToolbar>
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <Card className="py-0">
              <EmptyState
                title="No alerts match"
                description="Business events create alerts here and attempt email when ENABLE_EMAIL=true."
                icon={<BellRing className="size-5" />}
              />
            </Card>
          ) : (
            alerts.map((a) => {
              const isBreach =
                a.type === "deadline_breach" || a.type === "oc_deadline_breach" || a.type === "escalation";
              return (
                <Card key={a.id} className="py-0 transition-shadow hover:shadow-airbnb">
                  <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                    <div
                      className={
                        "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full " +
                        (isBreach
                          ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                          : "bg-secondary text-muted-foreground")
                      }
                    >
                      {isBreach ? <AlertTriangle className="size-4" /> : <Mail className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">
                            To: {a.recipient}
                            {a.recipientEmail ? ` · ${a.recipientEmail}` : ""}
                          </div>
                          <div className="text-sm font-semibold break-words">{a.subject}</div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                          <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                            {typeLabel(a.type)}
                          </Badge>
                          <EmailStatusBadge status={a.emailStatus || (a.emailSent ? "sent" : "disabled")} />
                          <span className="text-xs text-muted-foreground">{formatDateTime(a.createdAt)}</span>
                        </div>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                        {a.body.length > 400 ? `${a.body.slice(0, 400)}…` : a.body}
                      </p>
                      {a.emailStatus === "failed" && a.emailError && (
                        <p className="mt-1 text-xs text-[var(--status-breach)]">⚠ {a.emailError}</p>
                      )}
                      {a.oc && (
                        <Link
                          href={`/orders/${a.oc.id}`}
                          className="mt-2 inline-block text-xs font-medium text-primary hover:underline"
                        >
                          {a.oc.ocNumber}
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </PageBody>
    </div>
  );
}
