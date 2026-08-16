import { AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { UtilisationBar } from "./utilisation-bar";
import { bottleneckSummary, type ManpowerResult } from "@/lib/manpower";
import { formatDate, formatNumber } from "@/lib/format";

export function ManpowerResultPanel({
  result,
  workingDays,
  targetDate,
  earliestEndDate,
  onUseEarliestDate,
}: {
  result: ManpowerResult;
  workingDays: number;
  targetDate: Date;
  earliestEndDate: Date | null;
  onUseEarliestDate: () => void;
}) {
  if (result.status === "blocked") {
    const names = result.bottlenecks.map((b) => b.departmentName);
    return (
      <div className="animate-in fade-in slide-in-from-top-1 duration-300 rounded-lg border border-[var(--status-breach)]/30 bg-[var(--status-breach-bg)] p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[var(--status-breach)]" />
          <div className="space-y-1.5 text-sm">
            <p className="font-semibold text-[var(--status-breach)]">
              Not achievable in {workingDays} working days.
            </p>
            {result.reason === "capacity_exceeded" ? (
              <p className="text-foreground/80">
                {bottleneckSummary(names)}
                {names.length === 1 ? " caps" : names.length === 2 ? " both cap" : " all cap"} at{" "}
                {formatNumber(result.slowestCeiling ?? 0)} units per working day. Required rate:{" "}
                {result.requiredRate?.toFixed(2)} units/day.
              </p>
            ) : (
              <p className="text-foreground/80">
                This range is shorter than the procurement stage plus ramp allowance.
              </p>
            )}
            {result.earliestWorkingDays !== null && earliestEndDate && (
              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
                <p className="font-medium text-foreground">
                  Earliest completion: {result.earliestWorkingDays} working days — {formatDate(earliestEndDate)}.
                </p>
                <Button size="sm" variant="outline" className="w-full shrink-0 sm:w-auto" onClick={onUseEarliestDate}>
                  Use this date
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-top-1 duration-300 space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs text-muted-foreground">Total man-hours</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{formatNumber(Math.round(result.totalManHours))}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs text-muted-foreground">Longest department</div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{result.longestWorkingDays.toFixed(2)} d</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-xs text-muted-foreground">Projected completion</div>
          <div className="mt-1 text-xl font-semibold">{formatDate(targetDate)}</div>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Required rate: <span className="font-medium text-foreground">{result.requiredRate.toFixed(2)} units/working day</span>
      </div>

      <div className="border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Workers</TableHead>
              <TableHead className="text-right">Working days</TableHead>
              <TableHead className="text-right">Hours</TableHead>
              <TableHead className="text-right">Man-hours</TableHead>
              <TableHead>Utilisation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.lines.map((l) => (
              <TableRow key={l.departmentId} className="h-12">
                <TableCell className="font-medium">{l.departmentName}</TableCell>
                <TableCell className="text-right tabular-nums">{l.workers}</TableCell>
                <TableCell className="text-right tabular-nums">{l.workingDays.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{l.workingHours.toFixed(1)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatNumber(Math.round(l.manHours))}</TableCell>
                <TableCell>
                  <UtilisationBar value={l.utilisation} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {result.materials.length > 0 && (
        <div>
          <div className="mb-1.5 text-sm font-medium">Materials required</div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {result.materials.map((m) => (
              <div key={m.materialName}>
                {m.materialName}:{" "}
                <span className="font-medium text-foreground">
                  {formatNumber(m.quantity, 1)} {m.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
