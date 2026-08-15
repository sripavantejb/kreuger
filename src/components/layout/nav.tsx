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
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/master-data", label: "Master data", icon: Database },
];

export function SidebarNav({ alertBadgeCount = 0 }: { alertBadgeCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-out",
              active
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:translate-x-0.5 hover:bg-secondary hover:text-foreground"
            )}
          >
            <Icon className="size-4 transition-transform duration-200" strokeWidth={2} />
            <span className="flex-1">{label}</span>
            {href === "/alerts" && alertBadgeCount > 0 && (
              <span
                className={cn(
                  "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                  active
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-[var(--status-breach)] text-white"
                )}
              >
                {alertBadgeCount > 99 ? "99+" : alertBadgeCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
