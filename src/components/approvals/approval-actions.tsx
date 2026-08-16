"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { approveStageChange, rejectStageChange } from "@/lib/actions-stage";

export function ApprovalActions({
  requestId,
  ocNumber,
}: {
  requestId: string;
  ocNumber: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [note, setNote] = useState("");

  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await approveStageChange(requestId);
            if (!res.ok) toast.error(res.error);
            else {
              toast.success(`${ocNumber} stage approved`);
              router.refresh();
            }
          })
        }
      >
        Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => setRejectOpen(true)}>
        Reject
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {ocNumber} stage change?</DialogTitle>
            <DialogDescription>The OC stays on its current stage. Add a reason for the requester.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason for rejection"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Keep pending
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await rejectStageChange(requestId, note);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success("Stage change rejected");
                    setRejectOpen(false);
                    router.refresh();
                  }
                })
              }
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
