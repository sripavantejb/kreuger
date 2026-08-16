"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  approveAndReleaseSalesOrder,
  rejectSalesOrder,
  sendBackSalesOrder,
  updateSalesOrderVerification,
} from "@/lib/actions-sales-orders";

export function SalesOrderVerificationForm({
  salesOrderId,
  productName,
  productCode,
  quantity,
  colourName,
  defaultLeadDays,
  canWrite,
  initial,
  status,
}: {
  salesOrderId: string;
  productName: string;
  productCode: string;
  quantity: number;
  colourName: string;
  defaultLeadDays: number;
  canWrite: boolean;
  status: string;
  initial: {
    itemCodeVerified: boolean;
    drawingVerified: boolean;
    bomVerified: boolean;
    orderDetailsVerified: boolean;
    notes: string;
  };
}) {
  const router = useRouter();
  const [itemCodeVerified, setItemCode] = useState(initial.itemCodeVerified);
  const [drawingVerified, setDrawing] = useState(initial.drawingVerified);
  const [bomVerified, setBom] = useState(initial.bomVerified);
  const [orderDetailsVerified, setDetails] = useState(initial.orderDetailsVerified);
  const [notes, setNotes] = useState(initial.notes);
  const [targetDays, setTargetDays] = useState(defaultLeadDays);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const locked = status === "released" || status === "rejected" || !canWrite;
  const allChecked = itemCodeVerified && drawingVerified && bomVerified && orderDetailsVerified;

  function persistChecks() {
    return updateSalesOrderVerification({
      id: salesOrderId,
      itemCodeVerified,
      drawingVerified,
      bomVerified,
      orderDetailsVerified,
      notes,
    });
  }

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Sales coordinator verification</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-check item code, drawing, BOM and order details before release. This is not a full BOM/ERP module.
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Product</dt>
          <dd className="font-medium">{productName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Item code</dt>
          <dd className="font-medium">{productCode}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Quantity</dt>
          <dd className="font-medium tabular-nums">{quantity}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Colour</dt>
          <dd className="font-medium">{colourName}</dd>
        </div>
      </dl>

      <div className="space-y-3">
        {(
          [
            ["itemCodeVerified", itemCodeVerified, setItemCode, "Item code verified"],
            ["drawingVerified", drawingVerified, setDrawing, "Drawing verified"],
            ["bomVerified", bomVerified, setBom, "BOM / materials verified"],
            ["orderDetailsVerified", orderDetailsVerified, setDetails, "Order details verified"],
          ] as const
        ).map(([key, value, setter, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 rounded border-border"
              checked={value}
              disabled={locked}
              onChange={(e) => setter(e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          rows={2}
          value={notes}
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {!locked && (
        <>
          <div className="space-y-1.5 max-w-xs">
            <Label htmlFor="targetDays">Target completion (days) for OC release</Label>
            <Input
              id="targetDays"
              type="number"
              min={1}
              value={targetDays}
              onChange={(e) => setTargetDays(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Send back / reject reason</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required for send back or reject" />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button
              disabled={pending || !allChecked}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await persistChecks();
                    const ocId = await approveAndReleaseSalesOrder({ id: salesOrderId, targetDays });
                    router.push(`/orders/${ocId}`);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Release failed");
                  }
                })
              }
            >
              {pending ? "Releasing…" : "Approve & release"}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await persistChecks();
                    await sendBackSalesOrder({ id: salesOrderId, reason: reason || "Needs correction" });
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Send back failed");
                  }
                })
              }
            >
              Send back
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  try {
                    await rejectSalesOrder({ id: salesOrderId, reason: reason || "Rejected" });
                    router.refresh();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Reject failed");
                  }
                })
              }
            >
              Reject
            </Button>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await persistChecks();
                  router.refresh();
                })
              }
            >
              Save checks
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
