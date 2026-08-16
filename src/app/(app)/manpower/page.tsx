import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UtilisationBar } from "@/components/manpower/utilisation-bar";
import { formatDate, formatNumber } from "@/lib/format";
import { ListToolbar } from "@/components/layout/list-toolbar";
import type { Prisma } from "@/generated/prisma";
import { Calculator } from "lucide-react";

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
        actions={
          <Button variant="outline" nativeButton={false} render={<Link href="/manpower/custom" />}>
            <Calculator /> Custom plan
          </Button>
        }
      />
      <div className="px-8 py-6">
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
                {filtered.map((oc, i) => (
                  <TableRow
                    key={oc.id}
                    className="h-14 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <TableCell className="font-medium">
                      <Link href={`/manpower/${oc.id}`} className="transition-colors hover:text-primary hover:underline">
                        {oc.ocNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {oc.product.name} · {oc.colour.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(oc.quantity)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {oc.manpowerPlan
                        ? `${formatDate(oc.manpowerPlan.startDate)} – ${formatDate(oc.manpowerPlan.endDate)}`
                        : "—"}
                    </TableCell>
                    <TableCell>
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
                    <TableCell>
                      {oc.manpowerPlan?.status === "achievable" && oc.manpowerPlan.lines.length > 0 ? (
                        <UtilisationBar value={Math.max(...oc.manpowerPlan.lines.map((l) => l.utilisation))} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
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
      </div>
    </div>
  );
}
