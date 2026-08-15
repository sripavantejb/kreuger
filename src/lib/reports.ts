// Pure aggregation over stage events — feeds the /reports charts. Kept
// dependency-free (no Prisma types) so it's easy to reason about and test.

export type StageEventForReport = {
  stageName: string;
  enteredAt: Date;
  exitedAt: Date | null;
  durationHours: number | null;
  deadlineDays: number;
  breached: boolean;
};

export type StageAggregate = {
  stageName: string;
  avgPlannedDays: number;
  avgActualDays: number;
  count: number;
};

export function stageDurationAggregates(events: StageEventForReport[]): StageAggregate[] {
  const closed = events.filter((e) => e.exitedAt && e.deadlineDays > 0);
  const byStage = new Map<string, { planned: number; actual: number; count: number }>();
  for (const e of closed) {
    const actualDays = (e.durationHours ?? 0) / 24;
    const bucket = byStage.get(e.stageName) ?? { planned: 0, actual: 0, count: 0 };
    bucket.planned += e.deadlineDays;
    bucket.actual += actualDays;
    bucket.count += 1;
    byStage.set(e.stageName, bucket);
  }
  return Array.from(byStage.entries()).map(([stageName, b]) => ({
    stageName,
    avgPlannedDays: b.planned / b.count,
    avgActualDays: b.actual / b.count,
    count: b.count,
  }));
}

export type OnTimeSummary = { onTime: number; breached: number };

export function onTimeSummary(events: StageEventForReport[]): OnTimeSummary {
  const closed = events.filter((e) => e.exitedAt && e.deadlineDays > 0);
  const breached = closed.filter((e) => e.breached).length;
  return { onTime: closed.length - breached, breached };
}

export type BottleneckCount = { stageName: string; breaches: number };

export function bottleneckFrequency(events: StageEventForReport[]): BottleneckCount[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.breached) counts.set(e.stageName, (counts.get(e.stageName) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([stageName, breaches]) => ({ stageName, breaches }))
    .sort((a, b) => b.breaches - a.breaches);
}
