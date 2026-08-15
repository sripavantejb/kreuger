"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { StageAggregate } from "@/lib/reports";

export function StageDurationChart({ data }: { data: StageAggregate[] }) {
  if (data.length === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No closed stages yet.</div>;
  }
  const chartData = data.map((d) => ({
    stage: d.stageName,
    Planned: Number(d.avgPlannedDays.toFixed(2)),
    Actual: Number(d.avgActualDays.toFixed(2)),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="stage" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
        <YAxis
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          tickLine={false}
          axisLine={false}
          label={{ value: "days", angle: -90, position: "insideLeft", fontSize: 11, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="Planned" fill="var(--muted-foreground)" radius={[3, 3, 0, 0]} opacity={0.5} />
        <Bar dataKey="Actual" fill="var(--primary)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
