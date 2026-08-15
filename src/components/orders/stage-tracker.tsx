import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function StageTracker({
  stageList,
  currentStage,
  breachedStages,
}: {
  stageList: string[];
  currentStage: string;
  breachedStages: Set<string>;
}) {
  const currentIndex = stageList.indexOf(currentStage);

  return (
    <div className="flex w-full items-start">
      {stageList.map((stage, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isLast = i === stageList.length - 1;
        const breached = breachedStages.has(stage);

        return (
          <div key={stage} className={cn("flex items-center", !isLast && "flex-1")}>
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-medium transition-colors duration-300 ease-out",
                  isDone && !breached && "border-[var(--status-ok)] bg-[var(--status-ok)] text-white",
                  isDone && breached && "border-[var(--status-breach)] bg-[var(--status-breach)] text-white",
                  isCurrent && !breached && "border-primary bg-primary text-primary-foreground",
                  isCurrent && breached && "border-[var(--status-breach)] bg-[var(--status-breach)] text-white animate-pulse",
                  !isDone && !isCurrent && "border-border bg-background text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-4 animate-in zoom-in-50 duration-300" /> : i + 1}
              </div>
              <div
                className={cn(
                  "max-w-24 text-center text-xs font-medium transition-colors duration-300",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {stage}
              </div>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-1 h-0.5 flex-1 self-start mt-4 transition-colors duration-500 ease-out",
                  isDone ? "bg-[var(--status-ok)]" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
