"use client";

import { useEffect, useState } from "react";

function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

export function StageCountdown({ enteredAt, deadlineDays }: { enteredAt: string; deadlineDays: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // Deferred to an effect so the server-rendered markup (no clock access)
    // matches the first client render, then ticks locally from here on.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return <span className="text-muted-foreground">…</span>;

  const entered = new Date(enteredAt).getTime();
  const deadlineMs = deadlineDays * 24 * 60 * 60 * 1000;
  const remaining = entered + deadlineMs - now;
  const overdue = remaining < 0;

  return (
    <span className={overdue ? "font-medium text-[var(--status-breach)]" : "text-foreground"}>
      {overdue ? `Overdue by ${formatDuration(remaining)}` : `${formatDuration(remaining)} remaining`}
    </span>
  );
}
