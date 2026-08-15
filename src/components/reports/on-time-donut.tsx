"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { OnTimeSummary } from "@/lib/reports";

export function OnTimeDonut({ summary }: { summary: OnTimeSummary }) {
  const total = summary.onTime + summary.breached;
  if (total === 0) {
    return <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No closed stages yet.</div>;
  }
  const data = [
    { name: "On time", value: summary.onTime, color: "var(--status-ok)" },
    { name: "Breached", value: summary.breached, color: "var(--status-breach)" },
  ];
  const pct = Math.round((summary.onTime / total) * 100);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={70} outerRadius={100} paddingAngle={2} strokeWidth={0}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold tabular-nums">{pct}%</div>
        <div className="text-xs text-muted-foreground">on time</div>
      </div>
    </div>
  );
}
