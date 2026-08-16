"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { advanceStage, requestStageAdvance, cancelStageChangeRequest } from "@/lib/actions-stage";
import type { Role } from "@/lib/roles";

export function AdvanceStageButton({
  ocId,
  nextStage,
  role,
  pendingRequest,
}: {
  ocId: string;
  nextStage: string;
  role: Role;
  pendingRequest: { id: string; toStage: string; requestedBy: string } | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const isAdmin = role === "ADMIN";
  const canRequest = role === "ADMIN" || role === "MANAGER" || role === "HEAD";

  if (!canRequest) return null;

  if (pendingRequest) {
    return (
      <div className="flex w-full flex-col items-stretch gap-2 sm:w-auto sm:items-end">
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
          <div className="font-medium text-foreground">Awaiting head approval</div>
          <div className="text-muted-foreground">
            → {pendingRequest.toStage} · requested by {pendingRequest.requestedBy}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <Button size="sm" variant="outline" nativeButton={false} render={<a href="/approvals" />}>
            Open approvals
          </Button>
          {(isAdmin || role === "MANAGER" || role === "HEAD") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await cancelStageChangeRequest(pendingRequest.id);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success("Stage request cancelled");
                    router.refresh();
                  }
                })
              }
            >
              Cancel request
            </Button>
          )}
          {isAdmin && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  try {
                    await advanceStage(ocId);
                    toast.success(`Advanced to ${nextStage}`);
                    router.refresh();
                  } catch {
                    toast.error("Could not force-advance stage");
                  }
                })
              }
            >
              Force advance <ArrowRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-1.5 sm:w-auto sm:items-end">
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button className="w-full sm:w-auto" disabled={pending} onClick={() => setOpen(true)}>
          <ShieldCheck className="size-4" />
          {pending ? "Submitting…" : `Request → ${nextStage}`}
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await advanceStage(ocId);
                  toast.success(`Advanced to ${nextStage}`);
                  router.refresh();
                } catch {
                  toast.error("Could not advance stage");
                }
              })
            }
          >
            {pending ? "Advancing…" : "Force advance"} <ArrowRight className="size-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request stage change</DialogTitle>
            <DialogDescription>
              Sends this OC to plant / department head approval before moving to <strong>{nextStage}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="stage-note">Note for approver (optional)</Label>
            <Textarea
              id="stage-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. Moulding complete — ready for fabrication"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await requestStageAdvance(ocId, note);
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Stage change submitted for head approval");
                  setOpen(false);
                  setNote("");
                  router.refresh();
                })
              }
            >
              {pending ? "Submitting…" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
