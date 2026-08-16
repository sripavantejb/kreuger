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

  const csvRows = quotations.map((row) => ({
    "Quotation #": row.quotationNumber,
    Date: formatDate(row.createdAt),
    Product: row.product.name,
    Colour: row.colour.name,
    Quantity: row.quantity,
    "Unit rate": row.unitRate,
    "Line total": row.lineTotal,
    Customer: row.vendorName,
  }));

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Customer quotations from product, quantity and colour — suggested price, preview and PDF."
        help={{
          content: (
            <>
              <p>A quotation prices a product and quantity using its base rate and quantity pricing slabs from Master Data. You can edit the suggested unit rate before saving.</p>
              <ul>
                <li><strong>Revise</strong> — create a new quotation number that references an earlier one.</li>
                <li><strong>Confirm sales order</strong> — after customer acceptance, open the sales-order verification workflow.</li>
              </ul>
            </>
          ),
        }}
        actions={
          canWrite && (
            <Button render={<Link href="/quotations/new" />} nativeButton={false}>
              <Plus /> New quotation
            </Button>
          )
        }
      />
      <PageBody>
        <ListToolbar searchPlaceholder="Search quotations…" sortOptions={SORT_OPTIONS}>
          <ExportCsvButton filename="quotations.csv" rows={csvRows} />
        </ListToolbar>
        <Card className="py-0">
          <CardContent className="p-0">
            {quotations.length === 0 ? (
              <EmptyState
                icon={<FileText className="size-5" />}
                title="No quotations yet"
                description="Create a quotation for a product, quantity and colour."
                action={
                  canWrite ? (
                    <Button render={<Link href="/quotations/new" />} nativeButton={false}>
                      <Plus /> New quotation
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quotation</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Colour</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit rate</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotations.map((row) => (
                    <ClickableTableRow key={row.id} href={`/quotations/${row.id}`} label={`Open ${row.quotationNumber}`}>
                      <TableCell className="font-medium">{row.quotationNumber}</TableCell>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell>{row.product.name}</TableCell>
                      <TableCell>{row.colour.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(row.quantity)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(row.unitRate)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatINR(row.lineTotal)}</TableCell>
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
