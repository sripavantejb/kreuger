"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { escalateStage, markFollowUpNoted, sendStageReminder } from "@/lib/actions-sales-orders";

export function FollowUpActions({ ocId, canWrite }: { ocId: string; canWrite: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (!canWrite) {
    return (
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/orders/${ocId}`} />}>
        View OC
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/orders/${ocId}`} />}>
        View OC
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await sendStageReminder(ocId);
            router.refresh();
          })
        }
      >
        Remind
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await escalateStage(ocId);
            router.refresh();
          })
        }
      >
        Escalate
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await markFollowUpNoted(ocId);
            router.refresh();
          })
        }
      >
        Mark done
      </Button>
    </div>
  );
}
