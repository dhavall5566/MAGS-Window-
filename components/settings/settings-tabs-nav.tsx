"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** Enterprise underline tab bar for settings. */
const SettingsTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <div className="border-b border-border/80 bg-card/50">
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        "flex w-full gap-0 overflow-x-auto px-4 sm:px-6 lg:px-8",
        className
      )}
      {...props}
    />
  </div>
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
      "group relative flex shrink-0 items-center gap-2.5 border-b-2 border-transparent px-4 py-3.5 text-left outline-none transition-colors",
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "data-[state=active]:border-primary data-[state=active]:text-foreground",
      "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground",
      "sm:px-5 sm:py-4",
      className
    )}
    {...props}
  >
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
        "bg-muted/60 text-muted-foreground",
        "group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary"
      )}
    >
      {icon}
    </span>
    <span className="min-w-0 flex flex-col gap-0.5 pr-1">
      <span className="whitespace-nowrap text-sm font-medium leading-tight">{children}</span>
      {description ? (
        <span className="hidden whitespace-nowrap text-[11px] leading-tight text-muted-foreground sm:block group-data-[state=active]:text-muted-foreground">
          {description}
        </span>
      ) : null}
    </span>
  </TabsPrimitive.Trigger>
));
SettingsTabsTrigger.displayName = "SettingsTabsTrigger";

export { SettingsTabsList, SettingsTabsTrigger };
