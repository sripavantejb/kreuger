"use client";

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
import { cancelOrder } from "@/lib/actions";
import { Ban } from "lucide-react";

export function CancelOrderButton({ ocId, ocNumber }: { ocId: string; ocNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Ban /> Cancel order
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel {ocNumber}?</DialogTitle>
            <DialogDescription>
              The order will be marked cancelled and removed from active tracking. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Keep order
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await cancelOrder(ocId);
                    router.refresh();
                    setOpen(false);
                  } catch {
                    setError("Could not cancel the order.");
                  }
                })
              }
            >
              {pending ? "Cancelling…" : "Cancel order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
