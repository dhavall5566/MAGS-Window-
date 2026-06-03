import Image from "next/image";
import { cn } from "@/lib/utils";

interface MagsLogoProps {
  /** full: wordmark + tagline, compact: smaller for sidebar */
  variant?: "full" | "compact";
  className?: string;
  priority?: boolean;
}

export function MagsLogo({
  variant = "full",
  className,
  priority = false,
}: MagsLogoProps) {
  return (
    <Image
      src="/mags-logo.png"
      alt="MAGS — Engineering Beyond Excellence"
      width={variant === "full" ? 220 : 160}
      height={variant === "full" ? 72 : 52}
      priority={priority}
      className={cn(
        "h-auto w-auto object-contain object-left",
        variant === "full" ? "max-h-16 max-w-[220px]" : "max-h-11 max-w-[160px]",
        className
      )}
    />
  );
}
