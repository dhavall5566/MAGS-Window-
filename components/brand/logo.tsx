"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { COMPANY } from "@/lib/company";

interface LogoProps {
  variant?: "sidebar" | "header" | "default";
  showTagline?: boolean;
  className?: string;
  href?: string | null;
}

export function Logo({
  variant = "default",
  showTagline = false,
  className,
  href = "/dashboard",
}: LogoProps) {
  const isSidebar = variant === "sidebar";

  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "flex items-center shrink-0",
          isSidebar && "rounded-lg bg-secondary px-2.5 py-1.5"
        )}
      >
        <Image
          src={COMPANY.logo}
          alt={`${COMPANY.name} logo`}
          width={isSidebar ? 130 : 115}
          height={isSidebar ? 36 : 32}
          className={cn(
            "h-auto w-auto object-contain object-left",
            isSidebar ? "max-h-8 max-w-[120px]" : "max-h-8 max-w-[105px]"
          )}
          priority
        />
      </div>
      {showTagline && (
        <div className="hidden lg:block border-l pl-2.5 border-sidebar-border/50">
          <p
            className={cn(
              "text-xs font-semibold leading-tight max-w-[130px]",
              isSidebar ? "text-sidebar-foreground" : "text-muted-foreground"
            )}
          >
            {COMPANY.tagline}
          </p>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
        {content}
      </Link>
    );
  }

  return content;
}
