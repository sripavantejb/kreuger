import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SidebarNav } from "@/components/layout/nav";
import { RouteTransition } from "@/components/layout/route-transition";
import { UserMenu } from "@/components/layout/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const alertBadgeCount = await prisma.ocStageEvent.count({
    where: { breached: true, exitedAt: null },
  });

  return (
    <div className="flex min-h-full">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-card py-5">
        <div className="px-6 pb-6">
          <div className="text-sm font-semibold tracking-tight">Kreuger Ops</div>
          <div className="text-xs text-muted-foreground">Mastro production console</div>
        </div>
        <SidebarNav alertBadgeCount={alertBadgeCount} />
        <div className="mt-auto px-3 pt-4">
          <UserMenu name={session.name} email={session.email} role={session.role} />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 min-w-0">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>
    </div>
  );
}
