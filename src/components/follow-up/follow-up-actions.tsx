"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHours, addDays, format, setHours, setMinutes } from "date-fns";
import { toast } from "sonner";
import { Bell, CalendarClock, Check, ChevronDown, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  cancelFollowUpReminder,
  escalateStage,
  markFollowUpNoted,
  reopenFollowUp,
  scheduleFollowUpReminder,
  sendStageReminder,
} from "@/lib/actions-sales-orders";
import { AssignTaskButton } from "@/components/tasks/assign-task-button";

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function FollowUpActions({
  ocId,
  ocNumber,
  stageName,
  canWrite,
  nextReminder,
  cleared,
}: {
  ocId: string;
  ocNumber: string;
  stageName: string;
  canWrite: boolean;
  nextReminder: { id: string; scheduledAt: string; note: string } | null;
  cleared: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [doneOpen, setDoneOpen] = useState(false);
  const [note, setNote] = useState("");
  const [when, setWhen] = useState(() => toLocalInputValue(addHours(new Date(), 2)));
  const [calOpen, setCalOpen] = useState(false);

  const whenDate = useMemo(() => {
    const d = new Date(when);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }, [when]);

  if (!canWrite) {
    return (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/orders/${ocId}`} />}>
        View OC
      </Button>
    );
  }

  function refresh() {
    router.refresh();
  }

  function applyPreset(kind: "1h" | "4h" | "tomorrow9" | "2d") {
    const now = new Date();
    let next: Date;
    if (kind === "1h") next = addHours(now, 1);
    else if (kind === "4h") next = addHours(now, 4);
    else if (kind === "2d") next = addDays(now, 2);
    else next = setMinutes(setHours(addDays(now, 1), 9), 0);
    setWhen(toLocalInputValue(next));
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {nextReminder && (
        <div className="flex max-w-[16rem] items-center gap-1.5 text-left text-[11px] text-muted-foreground">
          <CalendarClock className="size-3 shrink-0" />
          <span className="min-w-0 truncate">
            Next: {format(new Date(nextReminder.scheduledAt), "d MMM, HH:mm")}
            {nextReminder.note ? ` · ${nextReminder.note}` : ""}
          </span>
          <button
            type="button"
            className="shrink-0 underline-offset-2 hover:underline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await cancelFollowUpReminder(nextReminder.id);
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success("Scheduled reminder cancelled");
                  refresh();
                }
              })
            }
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/orders/${ocId}`} />}>
          View OC
        </Button>

        {cleared ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await reopenFollowUp(ocId);
                if (!res.ok) toast.error(res.error);
                else {
                  toast.success(`${ocNumber} reopened in follow-up`);
                  refresh();
                }
              })
            }
          >
            Reopen
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await sendStageReminder(ocId);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success(`Reminder sent for ${ocNumber}`);
                    refresh();
                  }
                })
              }
            >
              <Bell className="size-3.5" />
              Remind now
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setScheduleOpen(true)}>
              <CalendarClock className="size-3.5" />
              Schedule
            </Button>
            <AssignTaskButton ocId={ocId} ocNumber={ocNumber} stageName={stageName} />
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setEscalateOpen(true)}>
              <TriangleAlert className="size-3.5" />
              Escalate
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDoneOpen(true)}>
              <Check className="size-3.5" />
              Mark done
            </Button>
          </>
        )}
      </div>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule reminder — {ocNumber}</DialogTitle>
            <DialogDescription>
              Reminder email goes to the stage owner at the scheduled time. Cancelled automatically if the stage advances first.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`when-${ocId}`}>When</Label>
              <div className="flex gap-2">
                <Input
                  id={`when-${ocId}`}
                  type="datetime-local"
                  value={when}
                  onChange={(e) => setWhen(e.target.value)}
                  className="flex-1"
                />
                <Popover open={calOpen} onOpenChange={setCalOpen}>
                  <PopoverTrigger render={<Button type="button" variant="outline" size="icon" />}>
                    <ChevronDown className="size-4" />
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={whenDate}
                      onSelect={(d) => {
                        if (!d) return;
                        const merged = setMinutes(
                          setHours(d, whenDate.getHours()),
                          whenDate.getMinutes()
                        );
                        setWhen(toLocalInputValue(merged));
                        setCalOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["1h", "In 1 hour"],
                    ["4h", "In 4 hours"],
                    ["tomorrow9", "Tomorrow 9:00"],
                    ["2d", "In 2 days"],
                  ] as const
                ).map(([k, label]) => (
                  <Button key={k} type="button" size="xs" variant="outline" onClick={() => applyPreset(k)}>
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`note-${ocId}`}>Note (optional)</Label>
              <Textarea
                id={`note-${ocId}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Check moulding output before lunch"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await scheduleFollowUpReminder({
                    ocId,
                    scheduledAtIso: new Date(when).toISOString(),
                    note,
                  });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(`Reminder scheduled for ${format(new Date(when), "d MMM yyyy, HH:mm")}`);
                  setScheduleOpen(false);
                  setNote("");
                  refresh();
                })
              }
            >
              {pending ? "Scheduling…" : "Schedule reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Escalate confirm */}
      <Dialog open={escalateOpen} onOpenChange={setEscalateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate {ocNumber}?</DialogTitle>
            <DialogDescription>
              Sends an escalation email to the primary plant head for the current stage. This is logged in Alerts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateOpen(false)}>
              Keep
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await escalateStage(ocId);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success(`${ocNumber} escalated`);
                    setEscalateOpen(false);
                    refresh();
                  }
                })
              }
            >
              {pending ? "Escalating…" : "Escalate now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark done confirm */}
      <Dialog open={doneOpen} onOpenChange={setDoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark {ocNumber} follow-up done?</DialogTitle>
            <DialogDescription>
              Hides this OC from the active queue for the current stage and cancels pending schedules. It returns when the stage advances.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDoneOpen(false)}>
              Keep open
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const res = await markFollowUpNoted(ocId);
                  if (!res.ok) toast.error(res.error);
                  else {
                    toast.success(`${ocNumber} marked done for this stage`);
                    setDoneOpen(false);
                    refresh();
                  }
                })
              }
            >
              {pending ? "Saving…" : "Mark done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
