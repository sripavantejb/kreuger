import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { Plus, FileText } from "lucide-react";
import { ListToolbar } from "@/components/layout/list-toolbar";
import { ExportCsvButton } from "@/components/layout/export-csv-button";
import type { Prisma } from "@/generated/prisma";

export const dynamic = "force-dynamic";

const SORT_OPTIONS = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "qty_desc", label: "Quantity: high-low" },
  { value: "total_desc", label: "Total: high-low" },
];

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const [session, { q, sort }] = await Promise.all([getSession(), searchParams]);
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const where: Prisma.QuotationWhereInput = q
    ? {
        OR: [
          { quotationNumber: { contains: q, mode: "insensitive" } },
          { product: { name: { contains: q, mode: "insensitive" } } },
          { colour: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : {};

  const orderBy: Prisma.QuotationOrderByWithRelationInput =
    sort === "date_asc"
      ? { createdAt: "asc" }
      : sort === "qty_desc"
        ? { quantity: "desc" }
        : sort === "total_desc"
          ? { lineTotal: "desc" }
          : { createdAt: "desc" };

  const quotations = await prisma.quotation.findMany({
    where,
    include: { product: true, colour: true },
    orderBy,
  });

  const csvRows = quotations.map((q) => ({
    "PO #": q.quotationNumber,
    Date: formatDate(q.createdAt),
    Product: q.product.name,
    Colour: q.colour.name,
    Quantity: q.quantity,
    "Unit rate": q.unitRate,
    "Line total": q.lineTotal,
    Vendor: q.vendorName,
  }));

  return (
    <div>
      <PageHeader
        title="Purchase orders"
        description="Commercial POs with vendor, ship-to, HSN and GST — export as PDF."
        help={{
          content: (
            <>
              <p>A purchase order prices a product and quantity using its base rate and quantity pricing slabs from Master Data.</p>
              <ul>
                <li><strong>Revise</strong> — create a new PO number that supersedes an earlier one.</li>
                <li><strong>PDF export</strong> — download the Maruthi-style commercial layout.</li>
              </ul>
              <p>A PO on its own doesn&apos;t reserve capacity — that only happens once it becomes an order confirmation.</p>
            </>
          ),
        }}
        actions={
          canWrite && (
            <Button render={<Link href="/quotations/new" />} nativeButton={false}>
              <Plus /> New purchase order
            </Button>
          )
        }
      />
      <PageBody>
        <ListToolbar searchPlaceholder="Search purchase orders…" sortOptions={SORT_OPTIONS}>
          <ExportCsvButton filename="purchase-orders.csv" rows={csvRows} />
        </ListToolbar>
        <Card className="py-0">
          <CardContent className="p-0">
            {quotations.length === 0 ? (
              <EmptyState
                title="No purchase orders match"
                description="Create a purchase order to price a product and quantity."
                icon={<FileText className="size-5" />}
              />
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit rate</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <ClickableTableRow
                    key={q.id}
                    href={`/quotations/${q.id}`}
                    label={`Open purchase order ${q.quotationNumber}`}
                  >
                    <TableCell className="relative z-0 font-semibold group-hover/row:text-primary">
                      {q.quotationNumber}
                      {q.revisesQuotationNumber && (
                        <div className="text-xs font-normal text-muted-foreground">
                          revises {q.revisesQuotationNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="relative z-0 text-muted-foreground">{formatDate(q.createdAt)}</TableCell>
                    <TableCell className="relative z-0">{q.product.name}</TableCell>
                    <TableCell className="relative z-0 text-muted-foreground">{q.colour.name}</TableCell>
                    <TableCell className="relative z-0 text-right tabular-nums font-medium">{formatNumber(q.quantity)}</TableCell>
                    <TableCell className="relative z-0 text-right tabular-nums text-muted-foreground">{formatINR(q.unitRate)}</TableCell>
                    <TableCell className="relative z-0 text-right tabular-nums font-semibold">{formatINR(q.lineTotal)}</TableCell>
                  </ClickableTableRow>
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
