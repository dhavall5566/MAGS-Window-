"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedControlOption<T>[];
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
}: SegmentedControlProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      `[data-segment-value="${value}"]`
    );
    if (!active) return;
    const next = { left: active.offsetLeft, width: active.offsetWidth };
    setIndicator((prev) =>
      prev.left === next.left && prev.width === next.width ? prev : next
    );
  }, [value]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [updateIndicator]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = options.findIndex((option) => option.value === value);
    if (currentIndex === -1) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      const next = options[(currentIndex + 1) % options.length];
      onValueChange(next.value);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      const next = options[(currentIndex - 1 + options.length) % options.length];
      onValueChange(next.value);
    } else if (event.key === "Home") {
      event.preventDefault();
      onValueChange(options[0].value);
    } else if (event.key === "End") {
      event.preventDefault();
      onValueChange(options[options.length - 1].value);
    }
  };

  return (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      className={cn(
        "relative inline-flex items-center rounded-xl border border-border/60 bg-muted p-1 shadow-inner",
        className
      )}
      role="tablist"
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-lg border border-primary/20 bg-background shadow-md transition-[transform,width] duration-200 ease-out"
        style={{
          width: indicator.width,
          transform: `translateX(${indicator.left}px)`,
        }}
      />
      {options.map((option) => {
        const active = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            data-segment-value={option.value}
            onClick={() => onValueChange(option.value)}
            className={cn(
              "relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              active
                ? "font-semibold text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
