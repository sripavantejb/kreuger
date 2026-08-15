import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { roleAtLeast, type Role } from "./roles";

export { ROLES, roleAtLeast, type Role } from "./roles";

export const SESSION_COOKIE = "kreuger_session";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
};

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Server Components / Server Actions only.
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) throw new Error("Not authenticated");
  return session;
}

// Throws if the current session doesn't meet the minimum role. Use at the
// top of every mutating server action.
export async function requireRole(min: Role): Promise<SessionPayload> {
  const session = await requireSession();
  if (!roleAtLeast(session.role, min)) {
    throw new Error(`This action requires ${min} access.`);
  }
  return session;
}
