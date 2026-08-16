import type { ReactNode } from "react";
import { HelpTip } from "./help-tip";

export function PageHeader({
  title,
  description,
  actions,
  help,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  help?: { title?: string; content: ReactNode };
}) {
  return (
    <div className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm supports-backdrop-filter:bg-card/90">
      <div className="flex flex-col gap-3 px-4 py-5 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-[22px]">{title}</h1>
            {help && <HelpTip title={help.title ?? `How ${title} works`}>{help.content}</HelpTip>}
          </div>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:justify-end">{actions}</div>
        )}
      </div>
    </div>
  );
}
