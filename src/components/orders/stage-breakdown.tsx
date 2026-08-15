import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatDays } from "@/lib/format";
import { FINISHED_GOODS_STAGE } from "@/lib/stages";

export type StageEventLike = {
  stageName: string;
  enteredAt: Date;
  exitedAt: Date | null;
  durationHours: number | null;
  deadlineDays: number;
  breached: boolean;
};

export function StageBreakdown({ events }: { events: StageEventLike[] }) {
  // Server component: freshly computed per request, not memoized — safe to read the clock here.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <div className="border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Stage</TableHead>
            <TableHead>Entered</TableHead>
            <TableHead className="text-right">Planned</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => {
            const terminal = e.stageName === FINISHED_GOODS_STAGE;
            const actualDays = e.exitedAt
              ? (e.durationHours ?? 0) / 24
              : (now - e.enteredAt.getTime()) / 86_400_000;
            const variance = actualDays - e.deadlineDays;
            return (
              <TableRow key={e.stageName} className="h-12">
                <TableCell className="font-medium">{e.stageName}</TableCell>
                <TableCell className="text-muted-foreground">{formatDateTime(e.enteredAt)}</TableCell>
                <TableCell className="text-right tabular-nums">{terminal ? "—" : formatDays(e.deadlineDays)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {terminal ? "—" : formatDays(actualDays)}
                  {!e.exitedAt && !terminal && <span className="text-muted-foreground"> (so far)</span>}
                </TableCell>
                <TableCell
                  className={
                    "text-right tabular-nums " +
                    (terminal ? "" : variance > 0 ? "text-[var(--status-breach)]" : "text-[var(--status-ok)]")
                  }
                >
                  {terminal ? "—" : `${variance > 0 ? "+" : ""}${variance.toFixed(2)} d`}
                </TableCell>
                <TableCell>
                  {terminal ? (
                    <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                      Complete
                    </Badge>
                  ) : e.breached ? (
                    <Badge
                      variant="outline"
                      className={`border-transparent bg-[var(--status-breach-bg)] text-[var(--status-breach)] ${!e.exitedAt ? "animate-pulse" : ""}`}
                    >
                      Breached
                    </Badge>
                  ) : e.exitedAt ? (
                    <Badge variant="outline" className="border-transparent bg-[var(--status-ok-bg)] text-[var(--status-ok)]">
                      On time
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-transparent bg-secondary text-muted-foreground">
                      In progress
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
