// Client-safe role vocabulary — no server-only imports (no next/headers,
// no bcrypt), so client components can import this without dragging
// server-only code (see src/lib/auth.ts) into the browser bundle.

export const ROLES = ["ADMIN", "MANAGER", "HEAD", "VIEWER"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 0,
  HEAD: 1,
  MANAGER: 2,
  ADMIN: 3,
};

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Plant / department heads — stage approvals and assigned tasks. */
export function isHeadRole(role: Role): boolean {
  return role === "HEAD" || role === "ADMIN";
}

/** Can assign tasks and request stage changes. */
export function canAssignPlantWork(role: Role): boolean {
  return roleAtLeast(role, "MANAGER") || role === "HEAD";
}
