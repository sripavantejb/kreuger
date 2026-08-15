import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StageDurationChart } from "@/components/reports/stage-duration-chart";
import { OnTimeDonut } from "@/components/reports/on-time-donut";
import { BottleneckChart } from "@/components/reports/bottleneck-chart";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import { stageDurationAggregates, onTimeSummary, bottleneckFrequency } from "@/lib/reports";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await syncBreaches();

  const [events, ocs] = await Promise.all([
    prisma.ocStageEvent.findMany(),
    prisma.orderConfirmation.findMany({
      include: { product: true, colour: true, events: true },
      orderBy: { plannedAt: "desc" },
    }),
  ]);

  const durationAgg = stageDurationAggregates(events);
  const onTime = onTimeSummary(events);
  const bottlenecks = bottleneckFrequency(events);

  const ocRows = ocs.map((oc) => {
    const breachedCount = oc.events.filter((e) => e.breached).length;
    return { oc, breachedCount };
  });

  const csvRows = ocRows.map(({ oc, breachedCount }) => ({
    "OC number": oc.ocNumber,
    Product: oc.product.name,
    Colour: oc.colour.name,
    Quantity: oc.quantity,
    Status: oc.status,
    "Stages breached": breachedCount,
    Planned: formatDate(oc.plannedAt),
  }));

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Throughput, on-time performance and where orders most often get stuck."
        actions={<ExportCsvButton filename="report-summary.csv" rows={csvRows} />}
      />
      <div className="space-y-6 px-8 py-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Stage duration — planned vs actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StageDurationChart data={durationAgg} />
            </CardContent>
          </Card>
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "80ms" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">On-time completion</CardTitle>
            </CardHeader>
            <CardContent>
              <OnTimeDonut summary={onTime} />
            </CardContent>
          </Card>
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both"
            style={{ animationDelay: "160ms" }}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Bottleneck frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <BottleneckChart data={bottlenecks} />
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">Order summary</h2>
          <Card className="py-0">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OC number</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Stages breached</TableHead>
                    <TableHead>Planned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ocRows.map(({ oc, breachedCount }) => (
                    <TableRow key={oc.id} className="h-12">
                      <TableCell className="font-medium">{oc.ocNumber}</TableCell>
                      <TableCell>
                        {oc.product.name} · {oc.colour.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-transparent bg-secondary capitalize text-muted-foreground">
                          {oc.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {breachedCount > 0 ? (
                          <span className="font-medium text-[var(--status-breach)]">{breachedCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(oc.plannedAt)}</TableCell>
                    </TableRow>
                  ))}
                  {ocRows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
