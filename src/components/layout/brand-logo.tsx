import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_LOGO_URL } from "@/lib/brand";

const SIZES = {
  sm: { box: "size-7", px: 28 },
  md: { box: "size-9", px: 36 },
  lg: { box: "size-12", px: 48 },
  xl: { box: "size-16", px: 64 },
} as const;

export function BrandLogo({
  size = "md",
  className,
  priority = false,
}: {
  size?: keyof typeof SIZES;
  className?: string;
  priority?: boolean;
}) {
  const { box, px } = SIZES[size];
  return (
    <Image
      src={BRAND_LOGO_URL}
      alt="Kreuger"
      width={px}
      height={px}
      priority={priority}
      className={cn(box, "object-contain", className)}
    />
  );
}

export function BrandMark({
  size = "md",
  showWordmark = true,
  subtitle,
  className,
  wordmarkClassName,
  priority = false,
}: {
  size?: keyof typeof SIZES;
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandLogo size={size} priority={priority} />
      {showWordmark && (
        <div className="min-w-0">
          <div className={cn("truncate font-semibold tracking-tight text-foreground", wordmarkClassName)}>
            Kreuger Ops
          </div>
          {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
        </div>
      )}
    </div>
  );
}
