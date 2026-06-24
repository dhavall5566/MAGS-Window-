"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

function measureActiveTabIndicator(list: HTMLElement) {
  const active = list.querySelector<HTMLElement>('[data-state="active"]');
  if (!active) return null;

  const listRect = list.getBoundingClientRect();
  const activeRect = active.getBoundingClientRect();

  return {
    left: activeRect.left - listRect.left,
    width: activeRect.width,
  };
}

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, children, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });
  const [indicatorReady, setIndicatorReady] = React.useState(false);

  const updateIndicator = React.useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    const next = measureActiveTabIndicator(list);
    if (!next || next.width <= 0) return;

    setIndicatorReady(true);
    setIndicator((prev) =>
      prev.left === next.left && prev.width === next.width ? prev : next
    );
  }, []);

  React.useLayoutEffect(() => {
    updateIndicator();

    const list = listRef.current;
    if (!list) return;

    const scheduleUpdate = () => {
      requestAnimationFrame(updateIndicator);
    };

    const observer = new MutationObserver(scheduleUpdate);
    observer.observe(list, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    });

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(list);
    list.querySelectorAll('[role="tab"]').forEach((tab) => {
      resizeObserver.observe(tab);
    });

    window.addEventListener("resize", scheduleUpdate);
    document.fonts?.ready.then(scheduleUpdate).catch(() => undefined);

    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [updateIndicator, children]);

  return (
    <TabsPrimitive.List
      ref={(node) => {
        listRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      className={cn(
        "relative inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 rounded-sm bg-background shadow-sm transition-[left,width] duration-200 ease-out",
          !indicatorReady && "opacity-0"
        )}
        style={{
          left: indicator.left,
          width: indicator.width,
        }}
      />
      {children}
    </TabsPrimitive.List>
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative z-10 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
