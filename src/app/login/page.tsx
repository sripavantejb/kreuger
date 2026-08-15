import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 text-center">
          <div className="text-lg font-semibold tracking-tight">Kreuger Ops</div>
          <div className="text-sm text-muted-foreground">Mastro production console</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-5 text-base font-semibold">Sign in</h1>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
