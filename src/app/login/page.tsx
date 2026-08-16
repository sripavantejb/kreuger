import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { BrandLogo } from "@/components/layout/brand-logo";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[#f7f7f7]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,56,92,0.12),transparent_65%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(#dddddd 1px, transparent 1px), linear-gradient(90deg, #dddddd 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 20%, transparent 70%)",
        }}
      />

      <div className="relative w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandLogo size="xl" priority className="mb-4" />
          <div className="text-2xl font-semibold tracking-tight text-foreground">Kreuger Ops</div>
          <div className="mt-1.5 text-sm text-muted-foreground">Sign in to the production console</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-7 shadow-airbnb">
          <h1 className="mb-1 text-base font-semibold text-foreground">Welcome back</h1>
          <p className="mb-6 text-sm text-muted-foreground">Use your Kreuger account credentials.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
