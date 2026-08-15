// Client-safe role vocabulary — no server-only imports (no next/headers,
// no bcrypt), so client components can import this without dragging
// server-only code (see src/lib/auth.ts) into the browser bundle.

export const ROLES = ["ADMIN", "MANAGER", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_RANK: Record<Role, number> = { VIEWER: 0, MANAGER: 1, ADMIN: 2 };

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
