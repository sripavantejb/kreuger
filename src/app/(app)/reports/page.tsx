import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, SectionTitle } from "@/components/layout/page-body";
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
        help={{
          content: (
            <>
              <p>These charts are computed live from your order history — nothing is pre-canned.</p>
              <ul>
                <li><strong>Stage duration</strong> — average time orders spend in each department.</li>
                <li><strong>On-time performance</strong> — share of completed orders finished at or before their target date.</li>
                <li><strong>Bottleneck frequency</strong> — which department most often blocks or delays a capacity plan.</li>
              </ul>
              <p>Use Export CSV to take the summary figures into a spreadsheet.</p>
            </>
          ),
        }}
        actions={<ExportCsvButton filename="report-summary.csv" rows={csvRows} />}
      />
      <PageBody className="space-y-8">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Stage duration — planned vs actual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <StageDurationChart data={durationAgg} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">On-time completion</CardTitle>
            </CardHeader>
            <CardContent>
              <OnTimeDonut summary={onTime} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bottleneck frequency</CardTitle>
            </CardHeader>
            <CardContent>
              <BottleneckChart data={bottlenecks} />
            </CardContent>
          </Card>
        </div>

        <div>
          <SectionTitle>Order summary</SectionTitle>
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
                    <TableRow key={oc.id} className="h-14">
                      <TableCell className="font-semibold">{oc.ocNumber}</TableCell>
                      <TableCell className="text-muted-foreground">
                        <span className="text-foreground">{oc.product.name}</span>
                        <span className="mx-1.5 text-border">·</span>
                        {oc.colour.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{formatNumber(oc.quantity)}</TableCell>
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
      </PageBody>
    </div>
  );
}
