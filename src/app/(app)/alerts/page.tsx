import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { AlertTriangle, Mail, BellRing } from "lucide-react";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const TYPE_OPTIONS = [
  { value: "stage_entry", label: "Stage entry" },
  { value: "deadline_breach", label: "Deadline breach" },
  { value: "sales_order_confirmed", label: "Sales order confirmed" },
  { value: "follow_up_reminder", label: "Follow-up reminder" },
  { value: "escalation", label: "Escalation" },
];

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  await syncBreaches();
  const { q, filter } = await searchParams;

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
  });

  const csvRows = alerts.map((a) => ({
    Type: a.type,
    To: a.recipient,
    Subject: a.subject,
    Body: a.body,
    OC: a.oc?.ocNumber ?? "",
    Date: formatDateTime(a.createdAt),
  }));

  return (
    <div>
      <PageHeader
        title="Alerts"
        description="Every stage entry and deadline breach, exactly as it would land in an inbox. No email is actually sent — see BUILD_SPEC.md § Email."
        help={{
          content: (
            <>
              <p>This is a log of every notification the system generated, shown exactly as an email would read.</p>
              <ul>
                <li><strong>Stage entry alerts</strong> — sent to a department head when an order enters their stage.</li>
                <li><strong>Deadline breach alerts</strong> — sent when an order is still in production past its target date.</li>
              </ul>
              <p>Recipients are configured in Master Data → Recipients. Real email delivery is optional and off by default.</p>
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
                description="Stage-entry and deadline notifications will show up here as they’re generated."
                icon={<BellRing className="size-5" />}
              />
            </Card>
          ) : (
            alerts.map((a) => (
            <Card
              key={a.id}
              className="py-0 transition-shadow hover:shadow-airbnb"
            >
              <div className="flex items-start gap-3 px-4 py-4 sm:gap-4 sm:px-5">
                <div
                  className={
                    "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full " +
                    (a.type === "deadline_breach"
                      ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                      : "bg-secondary text-muted-foreground")
                  }
                >
                  {a.type === "deadline_breach" ? (
                    <AlertTriangle className="size-4" />
                  ) : (
                    <Mail className="size-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">To: {a.recipient}</div>
                      <div className="text-sm font-semibold break-words">{a.subject}</div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
                      <Badge
                        variant="outline"
                        className={
                          "border-transparent " +
                          (a.type === "deadline_breach"
                            ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                            : "bg-secondary text-muted-foreground")
                        }
                      >
                        {a.type === "deadline_breach" ? "Deadline breach" : "Stage entry"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-foreground/80">{a.body}</p>
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
            ))
          )}
        </div>
      </PageBody>
    </div>
  );
}
