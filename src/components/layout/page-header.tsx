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
    <div className="flex items-start justify-between gap-4 border-b border-border px-8 py-6">
      <div>
        <div className="flex items-center gap-1">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {help && <HelpTip title={help.title ?? `How ${title} works`}>{help.content}</HelpTip>}
        </div>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
