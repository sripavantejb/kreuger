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

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

  const entered = new Date(enteredAt);
  const expected = new Date(entered.getTime() + deadlineDays * 86_400_000);

  if (now === null) {
    return (
      <span className="text-muted-foreground">
        Started {formatDate(entered)} · Expected {formatDate(expected)}
      </span>
    );
  }

  const remaining = expected.getTime() - now;
  const overdue = remaining < 0;
  const status = overdue ? "DELAYED" : remaining < deadlineDays * 86_400_000 * 0.2 ? "AT RISK" : "ON TRACK";

  return (
    <span className="inline-flex flex-col gap-0.5 sm:inline">
      <span className="text-muted-foreground">
        Started {formatDate(entered)} · Expected {formatDate(expected)} · Now {formatDate(new Date(now))}
      </span>
      <span className={overdue ? "font-medium text-[var(--status-breach)]" : "font-medium text-foreground"}>
        Status: {status}
        {" · "}
        {overdue ? `Overdue by ${formatDuration(remaining)}` : `${formatDuration(remaining)} remaining`}
      </span>
    </span>
  );
}
