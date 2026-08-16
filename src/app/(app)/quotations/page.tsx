import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatINR, formatNumber } from "@/lib/format";
import { Plus } from "lucide-react";
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
    "Quotation #": q.quotationNumber,
    Date: formatDate(q.createdAt),
    Product: q.product.name,
    Colour: q.colour.name,
    Quantity: q.quantity,
    "Unit rate": q.unitRate,
    "Line total": q.lineTotal,
  }));

  return (
    <div>
      <PageHeader
        title="Quotations"
        description="Quantity-based pricing for Mastro, ready to export as a PDF."
        help={{
          content: (
            <>
              <p>A quotation prices a product and quantity using its base rate and the quantity pricing slabs set in Master Data — larger quantities unlock bigger discounts automatically.</p>
              <ul>
                <li><strong>Revise</strong> — create a new quotation number that supersedes an earlier one, keeping both on record.</li>
                <li><strong>Duplicate</strong> — start a new quotation pre-filled from an existing one.</li>
                <li><strong>PDF export</strong> — download a formatted quote to send to the customer.</li>
              </ul>
              <p>A quotation on its own doesn&apos;t reserve capacity — that only happens once it becomes an order.</p>
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
      <div className="px-4 sm:px-6 md:px-8 py-6">
        <ListToolbar searchPlaceholder="Search quotations…" sortOptions={SORT_OPTIONS}>
          <ExportCsvButton filename="quotations.csv" rows={csvRows} />
        </ListToolbar>
        <Card className="py-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Colour</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit rate</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q, i) => (
                  <TableRow
                    key={q.id}
                    className="h-14 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <TableCell className="font-medium">
                      <Link href={`/quotations/${q.id}`} className="transition-colors hover:text-primary hover:underline">
                        {q.quotationNumber}
                      </Link>
                      {q.revisesQuotationNumber && (
                        <div className="text-xs font-normal text-muted-foreground">
                          revises {q.revisesQuotationNumber}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(q.createdAt)}</TableCell>
                    <TableCell>{q.product.name}</TableCell>
                    <TableCell>{q.colour.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(q.quantity)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatINR(q.unitRate)}</TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{formatINR(q.lineTotal)}</TableCell>
                  </TableRow>
                ))}
                {quotations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No quotations match.
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
