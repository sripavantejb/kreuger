export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatDateTime(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDays(n: number): string {
  return `${formatNumber(n, n % 1 === 0 ? 0 : 2)} day${Math.abs(n) === 1 ? "" : "s"}`;
}

export type DeadlineStatus = "ok" | "warn" | "breach";

// >100% elapsed = breached, >=80% = approaching (amber), else on track.
export function deadlineStatus(elapsedDays: number, deadlineDays: number, breached: boolean): DeadlineStatus {
  if (breached || elapsedDays > deadlineDays) return "breach";
  if (deadlineDays > 0 && elapsedDays / deadlineDays >= 0.8) return "warn";
  return "ok";
}

export const statusClasses: Record<DeadlineStatus, { text: string; bg: string; label: string }> = {
  ok: { text: "text-[var(--status-ok)]", bg: "bg-[var(--status-ok-bg)]", label: "On track" },
  warn: { text: "text-[var(--status-warn)]", bg: "bg-[var(--status-warn-bg)]", label: "Approaching deadline" },
  breach: { text: "text-[var(--status-breach)]", bg: "bg-[var(--status-breach-bg)]", label: "Breached" },
};
