import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/layout/brand-logo";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="flex min-h-full items-center justify-center bg-background px-4 py-16">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="xl" priority className="mb-3" />
          <div className="text-xl font-semibold tracking-tight text-foreground">Kreuger Ops</div>
          <div className="mt-1 text-sm text-muted-foreground">Mastro production console</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 shadow-airbnb">
          <h1 className="mb-5 text-base font-semibold">Sign in</h1>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
