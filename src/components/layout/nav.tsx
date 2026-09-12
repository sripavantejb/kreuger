"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  ListChecks,
  BellRing,
  Database,
  BarChart3,
  Users2,
  ClipboardPlus,
  ShieldCheck,
  Users,
  ChevronDown,
  CalendarDays,
  Fingerprint,
  CalendarOff,
  Clock3,
  Wallet,
  FileSpreadsheet,
  PieChart,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/quotations", label: "Quotations", icon: FileText },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  { href: "/follow-up", label: "Follow-up", icon: ListChecks },
  { href: "/tasks", label: "Tasks", icon: ClipboardPlus },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/manpower", label: "Manpower", icon: Users2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/master-data", label: "Master data", icon: Database },
];

const hrmsLinks = [
  { href: "/hrms", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/hrms/employees", label: "Employees", icon: Users },
  { href: "/hrms/attendance", label: "Attendance", icon: CalendarDays },
  { href: "/hrms/biometric", label: "Biometric / eSSL", icon: Fingerprint },
  { href: "/hrms/leave", label: "Leave Management", icon: CalendarOff },
  { href: "/hrms/shifts", label: "Shifts", icon: Clock3 },
  { href: "/hrms/payroll", label: "Payroll", icon: Wallet },
  { href: "/hrms/payslips", label: "Payslips", icon: FileSpreadsheet },
  { href: "/hrms/reports", label: "Reports", icon: PieChart },
];

function navActive(pathname: string, href: string, exact?: boolean) {
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({
  alertBadgeCount = 0,
  onNavigate,
}: {
  alertBadgeCount?: number;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const onHrms = pathname === "/hrms" || pathname.startsWith("/hrms/");
  const [manualOpen, setManualOpen] = useState(false);
  const hrmsOpen = onHrms || manualOpen;

  return (
    <nav className="flex flex-col gap-1 px-3">
      {links.map(({ href, label, icon: Icon }) => {
        const active = navActive(pathname, href, href === "/");
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

      <div className="pt-1">
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
          className={cn(
            "relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
            onHrms
              ? "bg-secondary text-foreground shadow-[inset_3px_0_0_0_var(--primary)]"
              : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          )}
          aria-expanded={hrmsOpen}
        >
          <Users
            className={cn("size-4 shrink-0", onHrms ? "text-primary" : "text-muted-foreground")}
            strokeWidth={onHrms ? 2.25 : 1.75}
          />
          <span className="flex-1 truncate text-left">HRMS</span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              hrmsOpen && "rotate-180"
            )}
          />
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-200 ease-out",
            hrmsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
        >
          <div className="overflow-hidden">
            <div className="mt-1 flex flex-col gap-0.5 border-l border-border ml-5 pl-2">
              {hrmsLinks.map(({ href, label, icon: Icon, exact }) => {
                const active = navActive(pathname, href, exact);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "relative flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors duration-150",
                      active
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                    )}
                  >
                    <Icon
                      className={cn(
                        "size-3.5 shrink-0",
                        active ? "text-primary" : "text-muted-foreground"
                      )}
                      strokeWidth={active ? 2.25 : 1.75}
                    />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
