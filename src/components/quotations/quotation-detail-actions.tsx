"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteQuotation } from "@/lib/actions";
import { Download, Trash2, Copy } from "lucide-react";

export function QuotationDetailActions({
  quotationId,
  quotationNumber,
  productId,
  colourId,
  quantity,
  canWrite,
}: {
  quotationId: string;
  quotationNumber: string;
  productId: string;
  colourId: string;
  quantity: number;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <Button
        variant="outline"
        nativeButton={false}
        render={<Link href={`/quotations/${quotationId}/print`} target="_blank" />}
      >
        Print view
      </Button>
      <Button nativeButton={false} render={<a href={`/quotations/${quotationId}/pdf`} download />}>
        <Download /> Export PDF
      </Button>

      {canWrite && (
        <>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <Link
                href={`/quotations/new?productId=${productId}&colourId=${colourId}&quantity=${quantity}&revises=${quotationNumber}`}
              />
            }
          >
            <Copy /> Revise
          </Button>
          <Button variant="destructive" onClick={() => setOpen(true)}>
            <Trash2 /> Delete
          </Button>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {quotationNumber}?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await deleteQuotation(quotationId);
                  router.push("/quotations");
                })
              }
            >
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
