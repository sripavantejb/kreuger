"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { advanceStage } from "@/lib/actions";
import { ArrowRight } from "lucide-react";

export function AdvanceStageButton({ ocId, nextStage }: { ocId: string; nextStage: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Button
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await advanceStage(ocId);
              router.refresh();
            } catch {
              setError("Could not advance the stage.");
            }
          })
        }
        disabled={pending}
      >
        {pending ? "Advancing…" : `Advance to ${nextStage}`} <ArrowRight />
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
