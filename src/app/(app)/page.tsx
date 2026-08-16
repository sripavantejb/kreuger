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
import { ClipboardList, AlertTriangle, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await syncBreaches();

  const [ocs, quotationsThisMonth] = await Promise.all([
    prisma.orderConfirmation.findMany({
      include: { product: true, colour: true, events: { orderBy: { enteredAt: "desc" } } },
      orderBy: { plannedAt: "desc" },
    }),
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return prisma.quotation.count({ where: { createdAt: { gte: start } } });
    })(),
  ]);

  const activeOcs = ocs.filter((oc) => oc.status !== "closed" && oc.status !== "cancelled");
  const rows = ocs.map((oc) => {
    const openEvent = oc.events.find((e) => !e.exitedAt);
    let daysInStage = 0;
    let status: "ok" | "warn" | "breach" | null = null;
    if (openEvent) {
      // Server component: freshly computed per request, not memoized — safe to read the clock here.
      // eslint-disable-next-line react-hooks/purity
      daysInStage = (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000;
      status = deadlineStatus(daysInStage, openEvent.deadlineDays, openEvent.breached);
    }
    return { oc, openEvent, daysInStage, status };
  });
  const atRisk = rows.filter((r) => r.status === "warn" || r.status === "breach");

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live view of orders in production and this month's quoting activity."
        help={{
          content: (
            <>
              <p>The dashboard is a read-only snapshot — nothing here can be edited.</p>
              <ul>
                <li><strong>Orders in production</strong> — every order that has been released and hasn&apos;t reached Finished Goods yet, with its current stage and deadline status.</li>
                <li><strong>This month&apos;s quoting activity</strong> — quotations created in the current calendar month.</li>
              </ul>
              <p>Deadline colours: on track, at risk, or overdue — based on the order&apos;s target timeline versus today&apos;s date.</p>
            </>
          ),
        }}
      />
      <PageBody className="space-y-8">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Active OCs"
            value={activeOcs.length}
            hint="Currently in production"
            icon={<ClipboardList className="size-4" />}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
          />
          <StatCard
            label="At risk"
            value={atRisk.length}
            tone={atRisk.length > 0 ? "danger" : "default"}
            hint="Approaching or breached"
            icon={<AlertTriangle className="size-4" />}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "80ms" }}
          />
          <StatCard
            label="Purchase orders"
            value={quotationsThisMonth}
            hint="Created this month"
            icon={<FileText className="size-4" />}
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "160ms" }}
          />
        </div>

        <div>
          <SectionTitle>Orders in production</SectionTitle>
          <Card className="py-0 animate-in fade-in duration-500 fill-mode-both" style={{ animationDelay: "220ms" }}>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Released order confirmations will appear here with live stage and deadline status."
                  icon={<ClipboardList className="size-5" />}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OC number</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Current stage</TableHead>
                      <TableHead className="text-right">Days in stage</TableHead>
                      <TableHead>Deadline status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map(({ oc, daysInStage, status }) => (
                      <ClickableTableRow
                        key={oc.id}
                        href={`/orders/${oc.id}`}
                        label={`Open order ${oc.ocNumber}`}
                      >
                        <TableCell className="relative z-0 font-semibold group-hover/row:text-primary">
                          {oc.ocNumber}
                        </TableCell>
                        <TableCell className="relative z-0 text-muted-foreground">
                          <span className="text-foreground">{oc.product.name}</span>
                          <span className="mx-1.5 text-border">·</span>
                          {oc.colour.name}
                        </TableCell>
                        <TableCell className="relative z-0 text-right tabular-nums font-medium">
                          {formatNumber(oc.quantity)}
                        </TableCell>
                        <TableCell className="relative z-0">{oc.currentStage}</TableCell>
                        <TableCell className="relative z-0 text-right tabular-nums text-muted-foreground">
                          {oc.currentStage === FINISHED_GOODS_STAGE ? "—" : formatDays(daysInStage)}
                        </TableCell>
                        <TableCell className="relative z-0">
                          {status ? (
                            <Badge
                              variant="outline"
                              className={`${statusClasses[status].text} ${statusClasses[status].bg} border-transparent ${status === "breach" ? "animate-pulse" : ""}`}
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
