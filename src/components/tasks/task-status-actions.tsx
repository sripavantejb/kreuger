"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updatePlantTaskStatus } from "@/lib/actions-plant-tasks";

export function TaskStatusActions({
  taskId,
  status,
}: {
  taskId: string;
  status: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(next: "open" | "in_progress" | "done" | "cancelled") {
    startTransition(async () => {
      const res = await updatePlantTaskStatus(taskId, next);
      if (!res.ok) toast.error(res.error);
      else {
        toast.success(`Task marked ${next.replace("_", " ")}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-wrap justify-end gap-1">
      {status !== "in_progress" && status !== "done" && (
        <Button size="xs" variant="outline" disabled={pending} onClick={() => setStatus("in_progress")}>
          Start
        </Button>
      )}
      {status !== "done" && (
        <Button size="xs" variant="outline" disabled={pending} onClick={() => setStatus("done")}>
          Done
        </Button>
      )}
      {status !== "cancelled" && status !== "done" && (
        <Button size="xs" variant="ghost" disabled={pending} onClick={() => setStatus("cancelled")}>
          Cancel
        </Button>
      )}
    </div>
  );
}
