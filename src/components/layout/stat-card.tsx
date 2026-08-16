import type { CSSProperties, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon,
  className,
  style,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "danger" | "ok" | "warn";
  icon?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const valueTone =
    tone === "danger"
      ? "text-[var(--status-breach)]"
      : tone === "ok"
        ? "text-[var(--status-ok)]"
        : tone === "warn"
          ? "text-[var(--status-warn)]"
          : "text-foreground";

  return (
    <Card className={cn("gap-0 py-0 shadow-none hover:shadow-none", className)} style={style}>
      <CardContent className="flex items-start gap-3 p-5">
        {icon && (
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className={cn("mt-1.5 text-3xl font-semibold tracking-tight tabular-nums", valueTone)}>
            {value}
          </div>
          {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
