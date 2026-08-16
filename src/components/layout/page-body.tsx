import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Consistent padded content region under PageHeader */
export function PageBody({
  children,
  className,
  narrow,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 py-6 sm:px-6 md:px-8",
        narrow && "mx-auto w-full max-w-3xl",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("mb-3 text-sm font-semibold tracking-tight text-foreground", className)}>
      {children}
    </h2>
  );
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      {icon && (
        <div className="mb-1 flex size-11 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          {icon}
        </div>
      )}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
