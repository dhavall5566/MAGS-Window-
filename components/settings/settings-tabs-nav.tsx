"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Compact vertical nav for settings — no sliding pill indicator. */
const SettingsTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "flex w-full shrink-0 gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-sm",
      "lg:w-[13.5rem] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:p-1.5",
      className
    )}
    {...props}
  />
));
SettingsTabsList.displayName = "SettingsTabsList";

const SettingsTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> & {
    description?: string;
    icon?: React.ReactNode;
  }
>(({ className, description, icon, children, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "group relative flex min-w-[6.5rem] shrink-0 items-center gap-2.5 rounded-lg px-2 py-2 text-left outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-[state=active]:bg-primary/10 data-[state=active]:text-foreground",
      "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/60 data-[state=inactive]:hover:text-foreground",
      "lg:min-w-0 lg:w-full lg:px-2.5 lg:py-2",
      "lg:data-[state=active]:before:absolute lg:data-[state=active]:before:left-0 lg:data-[state=active]:before:top-2 lg:data-[state=active]:before:bottom-2 lg:data-[state=active]:before:w-0.5 lg:data-[state=active]:before:rounded-full lg:data-[state=active]:before:bg-primary",
      className
    )}
    {...props}
  >
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-background/80 text-muted-foreground transition-colors",
        "group-data-[state=active]:border-primary/25 group-data-[state=active]:bg-primary/15 group-data-[state=active]:text-primary"
      )}
    >
      {icon}
    </span>
    <span className="min-w-0 flex flex-col gap-0.5">
      <span className="truncate text-sm font-medium leading-tight">{children}</span>
      {description ? (
        <span className="hidden truncate text-[11px] leading-tight text-muted-foreground lg:block group-data-[state=active]:text-foreground/70">
          {description}
        </span>
      ) : null}
    </span>
  </TabsPrimitive.Trigger>
));
SettingsTabsTrigger.displayName = "SettingsTabsTrigger";

export { SettingsTabsList, SettingsTabsTrigger };
