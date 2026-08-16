"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  BellRing,
  Database,
  BarChart3,
  Users2,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/manpower", label: "Manpower", icon: Users2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/master-data", label: "Master data", icon: Database },
];

export function SidebarNav({
  alertBadgeCount = 0,
  onNavigate,
}: {
  alertBadgeCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              active
                ? "bg-secondary text-foreground shadow-[inset_3px_0_0_0_var(--primary)]"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            <Icon
              className={cn("size-4 shrink-0", active ? "text-primary" : "text-muted-foreground")}
              strokeWidth={active ? 2.25 : 1.75}
            />
            <span className="flex-1 truncate">{label}</span>
            {href === "/alerts" && alertBadgeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                {alertBadgeCount > 99 ? "99+" : alertBadgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
