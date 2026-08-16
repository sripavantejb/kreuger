"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth-actions";
import { Button } from "@/components/ui/button";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  HEAD: "Plant head",
  VIEWER: "Viewer",
};

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-2.5 rounded-lg bg-secondary/60 px-2.5 py-2">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
        {name.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-semibold text-foreground">{name}</div>
        <div className="truncate text-[11px] text-muted-foreground" title={email}>
          {ROLE_LABEL[role] ?? role}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Sign out"
        className="text-muted-foreground hover:text-foreground"
        disabled={pending}
        onClick={() => startTransition(() => logout())}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
