import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { deadlineStatus, formatDays, formatNumber, statusClasses } from "@/lib/format";
import { FINISHED_GOODS_STAGE } from "@/lib/stages";

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

  const activeOcs = ocs.filter((oc) => oc.status !== "closed");
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
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active OCs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{activeOcs.length}</div>
            </CardContent>
          </Card>
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "80ms" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">OCs at risk</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums text-[var(--status-breach)]">
                {atRisk.length}
              </div>
            </CardContent>
          </Card>
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "160ms" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Quotations this month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{quotationsThisMonth}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="py-0 animate-in fade-in duration-500 fill-mode-both" style={{ animationDelay: "220ms" }}>
          <CardContent className="p-0">
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
                {rows.map(({ oc, daysInStage, status }, i) => (
                  <TableRow
                    key={oc.id}
                    className="h-14 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
                    style={{ animationDelay: `${260 + i * 40}ms` }}
                  >
                    <TableCell className="font-medium">
                      <Link href={`/orders/${oc.id}`} className="transition-colors hover:text-primary hover:underline">
                        {oc.ocNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {oc.product.name} · {oc.colour.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                    <TableCell>{oc.currentStage}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {oc.currentStage === FINISHED_GOODS_STAGE ? "—" : formatDays(daysInStage)}
                    </TableCell>
                    <TableCell>
                      {status ? (
                        <Badge
                          variant="outline"
                          className={`${statusClasses[status].text} ${statusClasses[status].bg} border-transparent transition-colors ${status === "breach" ? "animate-pulse" : ""}`}
                        >
                          {statusClasses[status].label}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                          Complete
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
