import type { PlanResult } from "@/lib/planning";
import { bottleneckSummary } from "@/lib/planning";
import { formatDays, formatNumber } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle } from "lucide-react";

export type MaterialLine = { materialName: string; unit: string; quantity: number };

export function CapacityPanel({
  result,
  targetDays,
  materials,
  constants,
}: {
  result: PlanResult;
  targetDays: number;
  materials: MaterialLine[];
  constants?: { procurementDays: number; rampDays: number; shiftHours: number };
}) {
  if (result.status === "blocked") {
    const names = result.bottlenecks.map((b) => b.departmentName);
    return (
      <div className="animate-in fade-in slide-in-from-top-1 duration-300 rounded-lg border border-[var(--status-breach)]/30 bg-[var(--status-breach-bg)] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--status-breach)]" />
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-[var(--status-breach)]">
              Not achievable in {targetDays} days.
            </p>
            {result.reason === "capacity_exceeded" ? (
              <p className="text-foreground/80">
                {bottleneckSummary(names)}
                {names.length > 1 ? " both cap" : " caps"} at{" "}
                {formatNumber(result.slowestCeiling ?? 0)} units per day.
              </p>
            ) : (
              <p className="text-foreground/80">
                The timeline is shorter than the procurement lead time plus ramp allowance.
              </p>
            )}
            {result.earliestDays !== null && (
              <p className="font-medium text-foreground">
                Earliest completion: {result.earliestDays} days.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-300 space-y-4">
      {constants && (
        <p className="text-xs text-muted-foreground">
          Formula: production window = target ({targetDays}d) − procurement ({constants.procurementDays}d) − ramp (
          {constants.rampDays}d). Required rate = quantity ÷ window. Workers = ceil(rate ÷ units per worker per day).
          Values come from Master Data — change the timeline to recalculate.
        </p>
      )}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
        <div>
          Production window: <span className="font-medium text-foreground">{formatDays(result.productionWindow)}</span>
        </div>
        <div>
          Required rate:{" "}
          <span className="font-medium text-foreground">{result.requiredRate.toFixed(2)} units/day</span>
        </div>
        <div>
          Overall: <span className="font-medium text-[var(--status-ok)]">Achievable</span>
        </div>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Workers</TableHead>
              <TableHead className="text-right">Stage days</TableHead>
              <TableHead className="text-right">Stage hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.departmentPlans.map((p) => (
              <TableRow key={p.departmentId} className="h-12">
                <TableCell className="font-medium">{p.departmentName}</TableCell>
                <TableCell className="text-right tabular-nums">{p.workers}</TableCell>
                <TableCell className="text-right tabular-nums">{p.stageDays.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{p.stageHours.toFixed(1)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {materials.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium">Materials required</div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {materials.map((m) => (
              <div key={m.materialName}>
                {m.materialName}: <span className="font-medium text-foreground">{formatNumber(m.quantity, 1)} {m.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
