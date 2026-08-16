import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { syncBreaches } from "@/lib/breach";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { deadlineStatus, formatDate, formatNumber, statusClasses } from "@/lib/format";
import { FINISHED_GOODS_STAGE } from "@/lib/stages";
import { Plus } from "lucide-react";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "in_progress", label: "In progress" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];
const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "qty_desc", label: "Quantity: high-low" },
];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; sort?: string }>;
}) {
  await syncBreaches();
  const [session, { q, filter, sort }] = await Promise.all([getSession(), searchParams]);
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const where: Prisma.OrderConfirmationWhereInput = {
    ...(filter && filter !== "all" ? { status: filter } : {}),
    ...(q
      ? {
          OR: [
            { ocNumber: { contains: q, mode: "insensitive" } },
            { product: { name: { contains: q, mode: "insensitive" } } },
            { colour: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.OrderConfirmationOrderByWithRelationInput =
    sort === "date_asc" ? { plannedAt: "asc" } : sort === "qty_desc" ? { quantity: "desc" } : { plannedAt: "desc" };

  const ocs = await prisma.orderConfirmation.findMany({
    where,
    include: { product: true, colour: true, events: { orderBy: { enteredAt: "desc" } } },
    orderBy,
  });

  const rowsForCsv = ocs.map((oc) => ({
    "OC number": oc.ocNumber,
    Product: oc.product.name,
    Colour: oc.colour.name,
    Quantity: oc.quantity,
    "Target days": oc.targetDays,
    "Current stage": oc.currentStage,
    Status: oc.status,
  }));

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Order confirmations, capacity plans and stage tracking."
        help={{
          content: (
            <>
              <p>An order confirmation (OC) is created from a product, quantity and target timeline. Releasing it runs a capacity plan against your Master Data department rates and either accepts it or tells you why it&apos;s blocked.</p>
              <ul>
                <li><strong>Stage tracking</strong> — each OC moves through the department stages in sequence; advancing a stage is logged and can trigger a deadline alert.</li>
                <li><strong>Deadline status</strong> — on track, at risk or overdue, based on the target timeline set at release.</li>
              </ul>
              <p>Open an order to see its full capacity breakdown, stage history and to advance or cancel it.</p>
            </>
          ),
        }}
        actions={
          canWrite && (
            <Button render={<Link href="/orders/new" />} nativeButton={false}>
              <Plus /> New OC
            </Button>
          )
        }
      />
      <div className="px-8 py-6">
        <ListToolbar
          searchPlaceholder="Search orders…"
          filterOptions={STATUS_OPTIONS}
          filterLabel="All statuses"
          sortOptions={SORT_OPTIONS}
        >
          <ExportCsvButton filename="orders.csv" rows={rowsForCsv} />
        </ListToolbar>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Current stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocs.map((oc, i) => {
                  const openEvent = oc.events.find((e) => !e.exitedAt);
                  let status: "ok" | "warn" | "breach" | null = null;
                  if (openEvent) {
                    // Server component: freshly computed per request, not memoized — safe to read the clock here.
                    // eslint-disable-next-line react-hooks/purity
                    const elapsedDays = (Date.now() - openEvent.enteredAt.getTime()) / 86_400_000;
                    status = deadlineStatus(elapsedDays, openEvent.deadlineDays, openEvent.breached);
                  }
                  return (
                    <TableRow
                      key={oc.id}
                      className="h-14 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
                      style={{ animationDelay: `${i * 40}ms` }}
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
                      <TableCell>{oc.targetDays} days</TableCell>
                      <TableCell>{oc.currentStage}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-transparent capitalize ${
                            oc.status === "cancelled"
                              ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                              : "bg-secondary text-muted-foreground"
                          }`}
                        >
                          {oc.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {status && oc.currentStage !== FINISHED_GOODS_STAGE && oc.status !== "cancelled" ? (
                          <Badge
                            variant="outline"
                            className={`${statusClasses[status].text} ${statusClasses[status].bg} border-transparent transition-colors ${status === "breach" ? "animate-pulse" : ""}`}
                          >
                            {statusClasses[status].label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">
                            {oc.status === "closed" ? formatDate(oc.plannedAt) : "—"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {ocs.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No orders match.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
