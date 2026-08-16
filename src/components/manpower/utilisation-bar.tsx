import { cn } from "@/lib/utils";

// Spec: green under 70%, amber to 90%, red above.
function utilisationColor(pct: number): string {
  if (pct >= 90) return "bg-[var(--status-breach)]";
  if (pct >= 70) return "bg-[var(--status-warn)]";
  return "bg-[var(--status-ok)]";
}
function utilisationTextColor(pct: number): string {
  if (pct >= 90) return "text-[var(--status-breach)]";
  if (pct >= 70) return "text-[var(--status-warn)]";
  return "text-[var(--status-ok)]";
}

export function UtilisationBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.round(value * 100);
  const width = Math.min(100, pct);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", utilisationColor(pct))}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={cn("tabular-nums text-xs font-medium", utilisationTextColor(pct))}>{pct}%</span>
    </div>
  );
}
