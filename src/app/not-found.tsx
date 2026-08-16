import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-full min-h-[70vh] flex-col items-center justify-center gap-3 px-4 sm:px-6 md:px-8 text-center">
      <div className="text-sm font-medium text-muted-foreground">404</div>
      <h1 className="text-lg font-semibold">Page not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or may have been removed.
      </p>
      <Button render={<Link href="/" />} nativeButton={false} className="mt-2">
        Back to dashboard
      </Button>
    </div>
  );
}
