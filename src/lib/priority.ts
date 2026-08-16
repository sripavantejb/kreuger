export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type Priority = (typeof PRIORITIES)[number];

export function isPriority(value: string): value is Priority {
  return (PRIORITIES as readonly string[]).includes(value);
}

export function priorityRank(p: string): number {
  switch (p) {
    case "URGENT":
      return 4;
    case "HIGH":
      return 3;
    case "NORMAL":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

export function priorityBadgeClass(p: string): string {
  switch (p) {
    case "URGENT":
      return "bg-[var(--status-breach-bg)] text-[var(--status-breach)] ring-1 ring-[var(--status-breach)]/30";
    case "HIGH":
      return "bg-amber-50 text-amber-800 ring-1 ring-amber-200";
    case "LOW":
      return "bg-secondary text-muted-foreground ring-1 ring-border";
    default:
      return "bg-secondary text-foreground ring-1 ring-border";
  }
}
