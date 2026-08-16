import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession, roleAtLeast } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { PageBody } from "@/components/layout/page-body";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesOrderVerificationForm } from "@/components/sales-orders/verification-form";
import { priorityBadgeClass } from "@/lib/priority";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SalesOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [so, session] = await Promise.all([
    prisma.salesOrder.findUnique({
      where: { id },
      include: {
        product: true,
        colour: true,
        quotation: true,
        orderConfirmation: true,
      },
    }),
    getSession(),
  ]);
  if (!so) notFound();
  const canWrite = session ? roleAtLeast(session.role, "MANAGER") : false;

  return (
    <div>
      <PageHeader
        title={so.soNumber}
        description={`${so.customerName || "Customer"} · ${formatDate(so.createdAt)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{so.status.replaceAll("_", " ")}</Badge>
            <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${priorityBadgeClass(so.priority)}`}>
              {so.priority}
            </span>
            {so.quotation && (
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/quotations/${so.quotation.id}`} />}>
                Quotation {so.quotation.quotationNumber}
              </Button>
            )}
            {so.orderConfirmation && (
              <Button size="sm" nativeButton={false} render={<Link href={`/orders/${so.orderConfirmation.id}`} />}>
                OC {so.orderConfirmation.ocNumber}
              </Button>
            )}
          </div>
        }
      />
      <PageBody className="space-y-6">
        {so.sendBackReason && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            Sent back: {so.sendBackReason}
          </div>
        )}
        {so.rejectReason && (
          <div className="rounded-md border border-[var(--status-breach)]/30 bg-[var(--status-breach-bg)] px-4 py-2 text-sm">
            Rejected: {so.rejectReason}
          </div>
        )}
        <SalesOrderVerificationForm
          salesOrderId={so.id}
          productName={so.product.name}
          productCode={so.product.code}
          quantity={so.quantity}
          colourName={so.colour.name}
          defaultLeadDays={so.product.defaultLeadDays}
          canWrite={canWrite}
          status={so.status}
          initial={{
            itemCodeVerified: so.itemCodeVerified,
            drawingVerified: so.drawingVerified,
            bomVerified: so.bomVerified,
            orderDetailsVerified: so.orderDetailsVerified,
            notes: so.notes,
          }}
        />
      </PageBody>
    </div>
  );
}
