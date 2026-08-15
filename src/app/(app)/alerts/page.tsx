import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { AlertTriangle, Mail } from "lucide-react";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const TYPE_OPTIONS = [
  { value: "stage_entry", label: "Stage entry" },
  { value: "deadline_breach", label: "Deadline breach" },
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
      />
      <div className="px-8 py-6 max-w-3xl">
        <ListToolbar searchPlaceholder="Search alerts…" filterOptions={TYPE_OPTIONS} filterLabel="All types">
          <ExportCsvButton filename="alerts.csv" rows={csvRows} />
        </ListToolbar>
        <div className="space-y-3">
          {alerts.map((a, i) => (
            <Card
              key={a.id}
              className="p-0 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both hover:shadow-md"
              style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
            >
              <div className="flex items-start gap-4 px-5 py-4">
                <div
                  className={
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full " +
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
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">To: {a.recipient}</div>
                      <div className="truncate text-sm font-semibold">{a.subject}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
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
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(a.createdAt)}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-sm text-foreground/80">{a.body}</p>
                  {a.oc && (
                    <Link
                      href={`/orders/${a.oc.id}`}
                      className="mt-1.5 inline-block text-xs text-primary hover:underline"
                    >
                      {a.oc.ocNumber}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {alerts.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No alerts match.</div>
          )}
        </div>
      </div>
    </div>
  );
}
