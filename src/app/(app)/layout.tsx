import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MobileShell } from "@/components/layout/mobile-shell";
import { RouteTransition } from "@/components/layout/route-transition";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const alertBadgeCount = await prisma.ocStageEvent.count({
    where: { breached: true, exitedAt: null },
  });

  return (
    <MobileShell
      alertBadgeCount={alertBadgeCount}
      user={{ name: session.name, email: session.email, role: session.role }}
    >
      <RouteTransition>{children}</RouteTransition>
    </MobileShell>
  );
}
