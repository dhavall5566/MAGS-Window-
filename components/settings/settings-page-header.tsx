"use client";

interface SettingsPageHeaderProps {
  title: string;
  description: string;
}

export function SettingsPageHeader({ title, description }: SettingsPageHeaderProps) {
  return (
    <div className="border-b border-border/80 bg-gradient-to-b from-muted/40 to-background">
      <div className="w-full px-4 py-6 sm:px-6 sm:py-7 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Administration
        </p>
        <h1
          id="page-title"
          tabIndex={-1}
          className="mt-1 text-2xl font-semibold tracking-tight text-foreground outline-none sm:text-[1.65rem]"
        >
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}
