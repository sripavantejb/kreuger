import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { processDueFollowUpReminders } from "@/lib/follow-up";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState, SectionTitle } from "@/components/layout/page-body";
import { StatCard } from "@/components/layout/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FollowUpActions } from "@/components/follow-up/follow-up-actions";
import { deadlineStatus, formatDays, formatNumber, statusClasses } from "@/lib/format";
import { priorityBadgeClass } from "@/lib/priority";
import { BellRing, CalendarClock, CheckCircle2, ListChecks, TriangleAlert } from "lucide-react";

export const dynamic = "force-dynamic";

function followUpLabel(status: "ok" | "warn" | "breach" | null) {
  if (status === "breach") return "Delayed";
  if (status === "warn") return "At Risk";
  return "On Track";
}

function fmtWhen(d: Date) {
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FollowUpPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await syncBreaches();
  const processed = await processDueFollowUpReminders();

  const session = await getSession();
  const canWrite = session ? roleAtLeast(session.role, "HEAD") : false;
  const sp = await searchParams;
  const view = sp.view === "cleared" ? "cleared" : sp.view === "scheduled" ? "scheduled" : "active";

  const [ocs, departments, settings, scheduledReminders, recentAlerts] = await Promise.all([
    prisma.orderConfirmation.findMany({
      where: { status: "in_progress" },
      include: {
        product: true,
        colour: true,
        events: { orderBy: { enteredAt: "desc" } },
        followUpReminders: {
          where: { status: "scheduled" },
          orderBy: { scheduledAt: "asc" },
        },
      },
      orderBy: { plannedAt: "desc" },
    }),
    prisma.department.findMany(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.followUpReminder.findMany({
      where: { status: "scheduled" },
      include: { oc: { include: { product: true } } },
      orderBy: { scheduledAt: "asc" },
      take: 40,
    }),
    prisma.alert.findMany({
      where: { type: { in: ["follow_up_reminder", "escalation"] } },
      include: { oc: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const ownerFor = (stage: string) => {
    if (stage === "Procuring raw material") return settings.procurementHeadName;
    if (stage === "Finished goods") return settings.dispatchHeadName;
    return departments.find((d) => d.name === stage)?.headName || stage;
  };

  const mapped = ocs.map((oc) => {
    const openEvent = oc.events.find((e) => !e.exitedAt);
    const daysInStage = openEvent ? (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000 : 0;
    const status = openEvent
      ? deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached)
      : null;
    const dueDate = openEvent
      ? new Date(openEvent.enteredAt.getTime() + openEvent.deadlineDays * 86_400_000)
      : null;
    const cleared = oc.followUpClearedStage === oc.currentStage;
    const nextReminder = oc.followUpReminders[0]
      ? {
          id: oc.followUpReminders[0].id,
          scheduledAt: oc.followUpReminders[0].scheduledAt.toISOString(),
          note: oc.followUpReminders[0].note,
        }
      : null;
    return { oc, openEvent, daysInStage, status, dueDate, cleared, nextReminder };
  });

  const activeRows = mapped.filter((r) => !r.cleared);
  const clearedRows = mapped.filter((r) => r.cleared);
  const delayed = activeRows.filter((r) => r.status === "breach");
  const atRisk = activeRows.filter((r) => r.status === "warn");
  const dueSoon = activeRows.filter((r) => {
    if (!r.dueDate || r.status === "breach") return false;
    const hours = (r.dueDate.getTime() - Date.now()) / 3_600_000;
    return hours >= 0 && hours <= 24;
  });

  const tableRows = view === "cleared" ? clearedRows : activeRows;

  return (
    <div>
      <PageHeader
        title="Stage follow-up"
        description="Remind owners, schedule follow-ups, escalate delays, and clear completed stage checks."
        help={{
          content: (
            <>
              <p>
                <strong>Remind now</strong> emails the stage owner immediately.{" "}
                <strong>Schedule</strong> queues a reminder for later (sent when due on this page load).{" "}
                <strong>Mark done</strong> hides the OC until the stage advances.
              </p>
              {processed.sent > 0 && (
                <p className="mt-2 text-muted-foreground">
                  Just dispatched {processed.sent} scheduled reminder{processed.sent === 1 ? "" : "s"}.
                </p>
              )}
            </>
          ),
        }}
      />
      <PageBody className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Active queue" value={String(activeRows.length)} icon={<ListChecks className="size-4" />} />
          <StatCard label="Delayed" value={String(delayed.length)} icon={<TriangleAlert className="size-4" />} />
          <StatCard label="Due in 24h" value={String(dueSoon.length)} icon={<BellRing className="size-4" />} />
          <StatCard
            label="Scheduled"
            value={String(scheduledReminders.length)}
            icon={<CalendarClock className="size-4" />}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["active", `Active (${activeRows.length})`],
              ["scheduled", `Scheduled (${scheduledReminders.length})`],
              ["cleared", `Done this stage (${clearedRows.length})`],
            ] as const
          ).map(([key, label]) => (
            <Link
              key={key}
              href={key === "active" ? "/follow-up" : `/follow-up?view=${key}`}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                view === key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {atRisk.length > 0 && view === "active" && (
          <p className="text-sm text-muted-foreground">
            {atRisk.length} OC{atRisk.length === 1 ? "" : "s"} at risk — consider scheduling a reminder before the deadline.
          </p>
        )}

        {view === "scheduled" ? (
          <Card className="py-0">
            <CardContent className="p-0">
              {scheduledReminders.length === 0 ? (
                <EmptyState
                  icon={<CalendarClock className="size-5" />}
                  title="No scheduled reminders"
                  description="Use Schedule on an active OC to queue a follow-up email."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Created by</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduledReminders.map((r) => (
                      <TableRow key={r.id} className="h-14">
                        <TableCell className="tabular-nums text-sm">{fmtWhen(r.scheduledAt)}</TableCell>
                        <TableCell className="font-medium">{r.oc.ocNumber}</TableCell>
                        <TableCell>{r.stageName}</TableCell>
                        <TableCell>{r.oc.product.name}</TableCell>
                        <TableCell className="max-w-56 truncate text-sm text-muted-foreground">
                          {r.note || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.createdBy || "—"}</TableCell>
                        <TableCell className="text-right">
                          <FollowUpActions
                            ocId={r.ocId}
                            ocNumber={r.oc.ocNumber}
                            stageName={r.stageName}
                            canWrite={canWrite}
                            nextReminder={{
                              id: r.id,
                              scheduledAt: r.scheduledAt.toISOString(),
                              note: r.note,
                            }}
                            cleared={false}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="py-0">
            <CardContent className="p-0">
              {tableRows.length === 0 ? (
                <EmptyState
                  icon={view === "cleared" ? <CheckCircle2 className="size-5" /> : <ListChecks className="size-5" />}
                  title={view === "cleared" ? "No cleared follow-ups" : "Nothing to follow up"}
                  description={
                    view === "cleared"
                      ? "OCs marked done for their current stage will appear here."
                      : "No in-progress orders need attention right now."
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OC</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Elapsed</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableRows.map(({ oc, daysInStage, status, dueDate, nextReminder, cleared }) => (
                      <TableRow key={oc.id} className="h-14">
                        <TableCell className="font-medium">{oc.ocNumber}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(oc.priority)}`}
                          >
                            {oc.priority}
                          </span>
                        </TableCell>
                        <TableCell>{oc.product.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                        <TableCell>{oc.currentStage}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{ownerFor(oc.currentStage)}</TableCell>
                        <TableCell className="text-sm">
                          {dueDate
                            ? dueDate.toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDays(daysInStage)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              status ? `${statusClasses[status].text} ${statusClasses[status].bg}` : undefined
                            }
                          >
                            {cleared ? "Done" : followUpLabel(status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <FollowUpActions
                            ocId={oc.id}
                            ocNumber={oc.ocNumber}
                            stageName={oc.currentStage}
                            canWrite={canWrite}
                            nextReminder={nextReminder}
                            cleared={cleared}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        <div>
          <SectionTitle>Recent follow-up activity</SectionTitle>
          <Card className="mt-3 py-0">
            <CardContent className="p-0">
              {recentAlerts.length === 0 ? (
                <EmptyState
                  icon={<BellRing className="size-5" />}
                  title="No reminder activity yet"
                  description="Reminders and escalations will show here."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>OC</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentAlerts.map((a) => (
                      <TableRow key={a.id} className="h-12">
                        <TableCell className="whitespace-nowrap text-sm tabular-nums">
                          {fmtWhen(a.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {a.type === "escalation" ? "Escalation" : "Reminder"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{a.oc?.ocNumber ?? "—"}</TableCell>
                        <TableCell className="max-w-[20rem] truncate text-sm">{a.subject}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.recipient}</TableCell>
                        <TableCell className="text-sm capitalize text-muted-foreground">
                          {a.emailStatus}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </PageBody>
    </div>
  );
}
