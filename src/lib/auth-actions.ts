"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  Prisma,
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
} from "@/generated/prisma";
import { prisma } from "./prisma";
import { SESSION_COOKIE, signSession, verifyPassword, type Role } from "./auth";

function loginFailureMessage(err: unknown): string {
  const isPrisma =
    err instanceof PrismaClientKnownRequestError ||
    err instanceof PrismaClientInitializationError ||
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientInitializationError;

  const text = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
  const unreachable =
    text.includes("server selection timeout") ||
    text.includes("connection reset") ||
    text.includes("can't reach") ||
    text.includes("no available servers") ||
    text.includes("p1001") ||
    text.includes("p1017");

  if (isPrisma || unreachable) {
    if (unreachable) {
      return "Cannot reach the database. In MongoDB Atlas → Network Access, allow your current IP (or 0.0.0.0/0 for demos), confirm the cluster is not paused, then retry.";
    }
    return "Database error while signing in. Please try again in a moment.";
  }
  return "Something went wrong signing in. Please try again.";
}

export async function login(email: string, password: string): Promise<{ error?: string }> {
  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return { error: "Invalid email or password." };

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) return { error: "Invalid email or password." };

    const token = await signSession({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
    });

    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return {};
  } catch (err) {
    console.error("login failed:", err);
    return { error: loginFailureMessage(err) };
  }
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
