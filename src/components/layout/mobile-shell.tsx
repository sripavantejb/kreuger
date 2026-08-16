"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/nav";
import { UserMenu } from "@/components/layout/user-menu";
import { BrandMark } from "@/components/layout/brand-logo";

export function MobileShell({
  alertBadgeCount,
  user,
  children,
}: {
  alertBadgeCount: number;
  user: { name: string; email: string; role: string };
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f7f7f7]">
      {/* Fixed desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex h-14 shrink-0 items-center border-b border-border px-4">
          <BrandMark size="sm" wordmarkClassName="text-sm" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          <div className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          <SidebarNav alertBadgeCount={alertBadgeCount} />
        </div>
        <div className="shrink-0 border-t border-border p-3">
          <UserMenu name={user.name} email={user.email} role={user.role} />
        </div>
      </aside>

      {/* Fixed top navbar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-4 md:left-60 md:px-6">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open menu"
          className="md:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu className="size-5" />
        </Button>
        <div className="min-w-0 flex-1 md:hidden">
          <BrandMark size="sm" wordmarkClassName="text-sm" />
        </div>
        <div className="hidden min-w-0 flex-1 md:block">
          <div className="text-sm font-semibold tracking-tight text-foreground">Production console</div>
        </div>
        <div className="hidden text-xs text-muted-foreground md:block">
          {user.name.split(" ")[0]} · {user.role === "ADMIN" ? "Admin" : user.role === "MANAGER" ? "Manager" : "Viewer"}
        </div>
      </header>

      {/* Scrollable main content */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col pt-14 md:pl-60">
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col bg-card shadow-airbnb animate-in slide-in-from-left duration-200">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <BrandMark size="sm" wordmarkClassName="text-sm" />
              <Button variant="ghost" size="icon-sm" aria-label="Close menu" onClick={() => setOpen(false)}>
                <X className="size-5" />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto py-4">
              <div className="mb-2 px-5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Workspace
              </div>
              <SidebarNav alertBadgeCount={alertBadgeCount} onNavigate={() => setOpen(false)} />
            </div>
            <div className="shrink-0 border-t border-border p-3">
              <UserMenu name={user.name} email={user.email} role={user.role} />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
