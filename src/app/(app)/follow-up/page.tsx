import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FollowUpActions } from "@/components/follow-up/follow-up-actions";
import { deadlineStatus, formatDays, formatNumber, statusClasses } from "@/lib/format";
import { priorityBadgeClass } from "@/lib/priority";
import { ListChecks } from "lucide-react";

export const dynamic = "force-dynamic";

function followUpLabel(status: "ok" | "warn" | "breach" | null, closed: boolean) {
  if (closed) return "Completed";
  if (status === "breach") return "Delayed";
  if (status === "warn") return "At Risk";
  return "On Track";
}

export default async function FollowUpPage() {
  await syncBreaches();
  const session = await getSession();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const [ocs, departments, settings] = await Promise.all([
    prisma.orderConfirmation.findMany({
      where: { status: { in: ["in_progress", "closed"] } },
      include: {
        product: true,
        colour: true,
        events: { orderBy: { enteredAt: "desc" } },
      },
      orderBy: { plannedAt: "desc" },
    }),
    prisma.department.findMany(),
    prisma.settings.findUniqueOrThrow({ where: { id: 1 } }),
  ]);

  const ownerFor = (stage: string) => {
    if (stage === "Procuring raw material") return settings.procurementHeadName;
    if (stage === "Finished goods") return settings.dispatchHeadName;
    return departments.find((d) => d.name === stage)?.headName || stage;
  };

  const rows = ocs
    .filter((oc) => oc.status === "in_progress")
    .map((oc) => {
      const openEvent = oc.events.find((e) => !e.exitedAt);
      // eslint-disable-next-line react-hooks/purity
      const daysInStage = openEvent ? (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000 : 0;
      const status = openEvent
        ? deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached)
        : null;
      const dueDate = openEvent
        ? new Date(openEvent.enteredAt.getTime() + openEvent.deadlineDays * 86_400_000)
        : null;
      return { oc, openEvent, daysInStage, status, dueDate };
    });

  return (
    <div>
      <PageHeader
        title="Stage follow-up"
        description="Active OCs by current stage — remind, escalate, or open the order."
        help={{
          content: (
            <>
              <p>Uses the same Alert infrastructure for reminders and escalations. Status colours: on track, at risk, delayed.</p>
            </>
          ),
        }}
      />
      <PageBody>
        <Card className="py-0">
          <CardContent className="p-0">
            {rows.length === 0 ? (
              <EmptyState
                icon={<ListChecks className="size-5" />}
                title="Nothing to follow up"
                description="No in-progress orders right now."
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
                  {rows.map(({ oc, daysInStage, status, dueDate }) => (
                    <TableRow key={oc.id} className="h-14">
                      <TableCell className="font-medium">{oc.ocNumber}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(oc.priority)}`}>
                          {oc.priority}
                        </span>
                      </TableCell>
                      <TableCell>{oc.product.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                      <TableCell>{oc.currentStage}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{ownerFor(oc.currentStage)}</TableCell>
                      <TableCell className="text-sm">
                        {dueDate
                          ? dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDays(daysInStage)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={status ? `${statusClasses[status].text} ${statusClasses[status].bg}` : undefined}
                        >
                          {followUpLabel(status, false)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <FollowUpActions ocId={oc.id} canWrite={canWrite} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}
