import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState, SectionTitle } from "@/components/layout/page-body";
import { StatCard } from "@/components/layout/stat-card";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { deadlineStatus, formatDays, formatNumber, statusClasses } from "@/lib/format";
import { FINISHED_GOODS_STAGE } from "@/lib/stages";
import { computeMaterialRequirements } from "@/lib/materials";
import { priorityBadgeClass } from "@/lib/priority";
import { ClipboardList, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await syncBreaches();

  const [ocs, quotationsThisMonth, products, pendingSos] = await Promise.all([
    prisma.orderConfirmation.findMany({
      include: {
        product: { include: { materials: true } },
        colour: true,
        events: { orderBy: { enteredAt: "desc" } },
        plan: { include: { department: true } },
      },
      orderBy: { plannedAt: "desc" },
    }),
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return prisma.quotation.count({ where: { createdAt: { gte: start } } });
    })(),
    prisma.product.findMany({ include: { materials: true } }),
    prisma.salesOrder.count({ where: { status: "pending_verification" } }),
  ]);

  const activeOcs = ocs.filter((oc) => oc.status === "in_progress");
  const completedOcs = ocs.filter((oc) => oc.status === "closed");
  const rows = ocs.map((oc) => {
    const openEvent = oc.events.find((e) => !e.exitedAt);
    let daysInStage = 0;
    let status: "ok" | "warn" | "breach" | null = null;
    if (openEvent) {
      // eslint-disable-next-line react-hooks/purity
      daysInStage = (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000;
      status = deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached);
    }
    return { oc, openEvent, daysInStage, status };
  });
  const delayed = rows.filter((r) => r.status === "breach" && r.oc.status === "in_progress");
  const atRisk = rows.filter((r) => r.status === "warn" && r.oc.status === "in_progress");
  const dueSoon = rows.filter(
    (r) => r.oc.status === "in_progress" && r.openEvent && r.daysInStage / Math.max(r.openEvent.deadlineDays, 0.01) >= 0.7
  );

  // Stage queue bottlenecks among active OCs
  const stageCounts = new Map<string, number>();
  for (const oc of activeOcs) {
    stageCounts.set(oc.currentStage, (stageCounts.get(oc.currentStage) ?? 0) + 1);
  }
  const topStages = [...stageCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // Demo material shortages across active OCs (aggregated by material name)
  const shortageMap = new Map<string, { unit: string; shortage: number }>();
  for (const oc of activeOcs) {
    for (const line of computeMaterialRequirements(oc.product.materials, oc.quantity)) {
      if (line.status !== "SHORTAGE") continue;
      const prev = shortageMap.get(line.materialName);
      shortageMap.set(line.materialName, {
        unit: line.unit,
        shortage: (prev?.shortage ?? 0) + line.shortage,
      });
    }
  }
  const shortages = [...shortageMap.entries()].slice(0, 3);

  // Sample utilisation from first active OC plan if present
  const utilHints: { name: string; pct: number }[] = [];
  const sample = activeOcs[0];
  if (sample?.plan.length) {
    for (const p of sample.plan) {
      const ceiling = Math.min(
        p.department.maxUnitsPerDay,
        p.department.headcount * p.department.unitsPerWorkerPerDay
      );
      const rate = sample.quantity / Math.max(sample.targetDays - 3 - 1.5, 0.1);
      utilHints.push({
        name: p.department.name,
        pct: Math.min(100, Math.round((rate / Math.max(ceiling, 0.01)) * 100)),
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Plant-manager snapshot: OCs, delays, bottlenecks and quoting activity."
        help={{
          content: (
            <>
              <p>Read-only operational snapshot. Material shortages use demo stock from Master Data — not SAP.</p>
              <p>{pendingSos} sales order(s) awaiting coordinator verification.</p>
            </>
          ),
        }}
      />
      <PageBody className="space-y-8">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard label="Active OCs" value={activeOcs.length} hint="In production" icon={<ClipboardList className="size-4" />} />
          <StatCard label="At risk" value={atRisk.length} tone={atRisk.length ? "danger" : "default"} hint="Approaching deadline" icon={<AlertTriangle className="size-4" />} />
          <StatCard label="Delayed" value={delayed.length} tone={delayed.length ? "danger" : "default"} hint="Deadline breached" icon={<AlertTriangle className="size-4" />} />
          <StatCard label="Due soon" value={dueSoon.length} hint="≥70% of stage deadline" icon={<ClipboardList className="size-4" />} />
          <StatCard label="Completed" value={completedOcs.length} hint="Finished goods" icon={<CheckCircle2 className="size-4" />} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Quotations" value={quotationsThisMonth} hint="Created this month" icon={<FileText className="size-4" />} />
          <StatCard label="SO pending" value={pendingSos} hint="Awaiting verification" icon={<ClipboardList className="size-4" />} />
          <StatCard label="Products" value={products.length} hint="In master data" icon={<FileText className="size-4" />} />
        </div>

        {(topStages.length > 0 || shortages.length > 0 || utilHints.length > 0) && (
          <div>
            <SectionTitle>Bottlenecks</SectionTitle>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {topStages.map(([stage, count]) => (
                <Card key={stage}>
                  <CardContent className="py-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Stage queue</div>
                    <div className="mt-1 font-semibold">{stage}</div>
                    <div className="text-sm text-muted-foreground">{count} order{count === 1 ? "" : "s"} waiting</div>
                  </CardContent>
                </Card>
              ))}
              {shortages.map(([name, info]) => (
                <Card key={name}>
                  <CardContent className="py-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Material (demo)</div>
                    <div className="mt-1 font-semibold">{name}</div>
                    <div className="text-sm text-[var(--status-breach)]">
                      {formatNumber(info.shortage)} {info.unit} shortage
                    </div>
                  </CardContent>
                </Card>
              ))}
              {utilHints.slice(0, 2).map((u) => (
                <Card key={u.name}>
                  <CardContent className="py-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Capacity hint</div>
                    <div className="mt-1 font-semibold">{u.name}</div>
                    <div className="text-sm text-muted-foreground">~{u.pct}% vs ceiling (sample active OC)</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <SectionTitle>Production pipeline</SectionTitle>
          <Card className="py-0">
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Released order confirmations appear here with stage and deadline status."
                  icon={<ClipboardList className="size-5" />}
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
                      <TableHead className="text-right">Days in stage</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ oc, daysInStage, status }) => (
                      <ClickableTableRow key={oc.id} href={`/orders/${oc.id}`} label={`Open order ${oc.ocNumber}`}>
                        <TableCell className="font-semibold">{oc.ocNumber}</TableCell>
                        <TableCell>
                          <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(oc.priority)}`}>
                            {oc.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          {oc.product.name}
                          <span className="mx-1.5 text-border">·</span>
                          <span className="text-muted-foreground">{oc.colour.name}</span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                        <TableCell>{oc.currentStage}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {oc.currentStage === FINISHED_GOODS_STAGE ? "—" : formatDays(daysInStage)}
                        </TableCell>
                        <TableCell>
                          {status ? (
                            <Badge
                              variant="outline"
                              className={`${statusClasses[status].text} ${statusClasses[status].bg} border-transparent`}
                            >
                              {statusClasses[status].label}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                              Complete
                            </Badge>
                          )}
                        </TableCell>
                      </ClickableTableRow>
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
