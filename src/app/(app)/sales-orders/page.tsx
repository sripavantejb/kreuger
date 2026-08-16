import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody, EmptyState } from "@/components/layout/page-body";
import { ClickableTableRow } from "@/components/layout/clickable-table-row";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, formatNumber } from "@/lib/format";
import { priorityBadgeClass } from "@/lib/priority";
import { ClipboardCheck, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SalesOrdersPage() {
  const session = await getSession();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  const orders = await prisma.salesOrder.findMany({
    include: { product: true, colour: true, quotation: true, orderConfirmation: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Sales orders"
        description="Confirmed orders awaiting sales coordinator verification before OC release."
        help={{
          content: (
            <>
              <p>Does not replace Zoho CRM. After a customer quotation is accepted, confirm a sales order here, verify item/drawing/BOM/details, then approve and release an OC.</p>
            </>
          ),
        }}
        actions={
          canWrite && (
            <Button render={<Link href="/sales-orders/new" />} nativeButton={false}>
              <Plus /> New sales order
            </Button>
          )
        }
      />
      <PageBody>
        <Card className="py-0">
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <EmptyState
                icon={<ClipboardCheck className="size-5" />}
                title="No sales orders"
                description="Confirm a quotation as a sales order, or create one manually."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SO</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Colour</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Quotation</TableHead>
                    <TableHead>OC</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((so) => (
                    <ClickableTableRow key={so.id} href={`/sales-orders/${so.id}`} label={`Open ${so.soNumber}`}>
                      <TableCell className="font-medium">{so.soNumber}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{so.status.replaceAll("_", " ")}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(so.priority)}`}>
                          {so.priority}
                        </span>
                      </TableCell>
                      <TableCell>{so.product.name}</TableCell>
                      <TableCell>{so.colour.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(so.quantity)}</TableCell>
                      <TableCell>{so.quotation?.quotationNumber ?? "—"}</TableCell>
                      <TableCell>{so.orderConfirmation?.ocNumber ?? "—"}</TableCell>
                      <TableCell>{formatDate(so.createdAt)}</TableCell>
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
