"use client";

import Link from "next/link";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/** Full-row navigation that still supports cmd/ctrl-click and middle-click. */
export function ClickableTableRow({
  href,
  label,
  children,
  className,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TableRow className={cn("group/row relative h-14 cursor-pointer", className)}>
      <Link
        href={href}
        aria-label={label}
        className="absolute inset-0 z-10"
      >
        <span className="sr-only">{label}</span>
      </Link>
      {children}
    </TableRow>
  );
}
