"use client";

import { cn } from "@/lib/utils";

interface SettingsSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  /** Omit top border for the first section in a panel. */
  first?: boolean;
}

export function SettingsSection({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
  first = false,
}: SettingsSectionProps) {
  return (
    <section
      className={cn(
        !first && "border-t border-border/80",
        className
      )}
    >
      <div className="flex flex-col gap-3 px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0 space-y-1">
          <h3 className="text-[15px] font-semibold tracking-tight text-foreground">{title}</h3>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
      <div className={cn("px-5 pb-6 sm:px-6", contentClassName)}>{children}</div>
    </section>
  );
}

interface SettingsPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function SettingsPanel({ children, className }: SettingsPanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}
