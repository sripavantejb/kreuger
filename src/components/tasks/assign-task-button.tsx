"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignPlantTask, getAssignableHeadsAction } from "@/lib/actions-plant-tasks";

type HeadOption = { key: string; label: string; name: string; email: string };

export function AssignTaskButton({
  ocId,
  ocNumber,
  stageName,
  defaultAssigneeKey,
}: {
  ocId?: string;
  ocNumber?: string;
  stageName?: string;
  defaultAssigneeKey?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [heads, setHeads] = useState<HeadOption[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeKey, setAssigneeKey] = useState(defaultAssigneeKey ?? "");
  const [dueAt, setDueAt] = useState("");
  const [priority, setPriority] = useState("NORMAL");

  useEffect(() => {
    if (!open) return;
    void getAssignableHeadsAction().then((list) => {
      setHeads(list);
      if (!assigneeKey && (defaultAssigneeKey || list[0])) {
        setAssigneeKey(defaultAssigneeKey && list.some((h) => h.key === defaultAssigneeKey)
          ? defaultAssigneeKey
          : list[0]!.key);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ClipboardPlus className="size-3.5" />
        Assign task
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign task to plant head</DialogTitle>
            <DialogDescription>
              {ocNumber
                ? `Creates a task for ${ocNumber} and notifies the selected head.`
                : "Creates a plant task and notifies the selected head."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="task-title">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Confirm moulding capacity for OC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-desc">Details</Label>
              <Textarea
                id="task-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign to</Label>
              <Select value={assigneeKey} onValueChange={(v) => setAssigneeKey(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select head" />
                </SelectTrigger>
                <SelectContent>
                  {heads.map((h) => (
                    <SelectItem key={h.key} value={h.key}>
                      {h.label} — {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={priority} onValueChange={(v) => setPriority(v ?? "NORMAL")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["LOW", "NORMAL", "HIGH", "URGENT"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-due">Due (optional)</Label>
                <Input
                  id="task-due"
                  type="datetime-local"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !title.trim() || !assigneeKey}
              onClick={() =>
                startTransition(async () => {
                  const res = await assignPlantTask({
                    title,
                    description,
                    ocId: ocId ?? null,
                    assigneeKey,
                    priority: priority as "LOW" | "NORMAL" | "HIGH" | "URGENT",
                    dueAtIso: dueAt ? new Date(dueAt).toISOString() : null,
                    stageName,
                  });
                  if (!res.ok) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Task assigned");
                  setOpen(false);
                  setTitle("");
                  setDescription("");
                  router.refresh();
                })
              }
            >
              {pending ? "Assigning…" : "Assign task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
