import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UtilisationBar } from "@/components/manpower/utilisation-bar";
import { formatDate, formatNumber } from "@/lib/format";
import { ListToolbar } from "@/components/layout/list-toolbar";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "achievable", label: "Achievable" },
  { value: "blocked", label: "Blocked" },
  { value: "none", label: "Not yet computed" },
];

export default async function ManpowerListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { q, filter } = await searchParams;

  const where: Prisma.OrderConfirmationWhereInput = q
    ? {
        OR: [
          { ocNumber: { contains: q, mode: "insensitive" } },
          { product: { name: { contains: q, mode: "insensitive" } } },
          { colour: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  // Reads the existing OrderConfirmation table directly — no parallel
  // orders table, no copied rows.
  const ocs = await prisma.orderConfirmation.findMany({
    where,
    include: { product: true, colour: true, manpowerPlan: { include: { lines: true } } },
    orderBy: { plannedAt: "desc" },
  });

  const filtered = ocs.filter((oc) => {
    if (!filter || filter === "all") return true;
    if (filter === "none") return !oc.manpowerPlan;
    return oc.manpowerPlan?.status === filter;
  });

  return (
    <div>
      <PageHeader
        title="Manpower efficiency"
        description="Pick any existing order confirmation to see department headcount, hours and utilisation for a date range."
        help={{
          content: (
            <>
              <p>For a chosen date range, this converts a quantity into the number of working days available (skipping weekly offs and holidays), then computes how many workers each department needs to hit that window.</p>
              <ul>
                <li><strong>Achievable</strong> — shows workers, working hours, man-hours and utilisation per department.</li>
                <li><strong>Blocked</strong> — names the department(s) whose daily ceiling can&apos;t be reached and the earliest date that is achievable.</li>
                <li><strong>What-if override</strong> — preview a different product, quantity or colour without changing the saved plan.</li>
              </ul>
              <p>Weekly off days and holidays are set in Master Data.</p>
            </>
          ),
        }}
      />
      <PageBody>
        <ListToolbar
          searchPlaceholder="Search orders…"
          filterOptions={STATUS_OPTIONS}
          filterLabel="All plans"
        />
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OC number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Plan status</TableHead>
                  <TableHead>Peak utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((oc) => (
                  <ClickableTableRow
                    key={oc.id}
                    href={`/manpower/${oc.id}`}
                    label={`Open manpower plan for ${oc.ocNumber}`}
                  >
                    <TableCell className="relative z-0 font-semibold group-hover/row:text-primary">
                      {oc.ocNumber}
                    </TableCell>
                    <TableCell className="relative z-0 text-muted-foreground">
                      <span className="text-foreground">{oc.product.name}</span>
                      <span className="mx-1.5 text-border">·</span>
                      {oc.colour.name}
                    </TableCell>
                    <TableCell className="relative z-0 text-right tabular-nums font-medium">{formatNumber(oc.quantity)}</TableCell>
                    <TableCell className="relative z-0 text-muted-foreground">
                      {oc.manpowerPlan
                        ? `${formatDate(oc.manpowerPlan.startDate)} – ${formatDate(oc.manpowerPlan.endDate)}`
                        : "—"}
                    </TableCell>
                    <TableCell className="relative z-0">
                      {oc.manpowerPlan ? (
                        <Badge
                          variant="outline"
                          className={`border-transparent capitalize ${
                            oc.manpowerPlan.status === "blocked"
                              ? "bg-[var(--status-breach-bg)] text-[var(--status-breach)]"
                              : "bg-[var(--status-ok-bg)] text-[var(--status-ok)]"
                          }`}
                        >
                          {oc.manpowerPlan.status}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                          Not yet computed
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="relative z-0">
                      {oc.manpowerPlan?.status === "achievable" && oc.manpowerPlan.lines.length > 0 ? (
                        <UtilisationBar value={Math.max(...oc.manpowerPlan.lines.map((l) => l.utilisation))} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </ClickableTableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No orders match.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PageBody>
    </div>
  );
}
