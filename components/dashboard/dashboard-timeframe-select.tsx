"use client";

import { Calendar } from "lucide-react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  DASHBOARD_TIMEFRAMES,
  type DashboardTimeframe,
} from "@/lib/dashboard-timeframe";
import { cn } from "@/lib/utils";

interface DashboardTimeframeSelectProps {
  value: DashboardTimeframe;
  onChange: (value: DashboardTimeframe) => void;
  compact?: boolean;
  className?: string;
}

export function DashboardTimeframeSelect({
  value,
  onChange,
  compact = false,
  className,
}: DashboardTimeframeSelectProps) {
  return (
    <SearchableSelect
      value={value}
      onValueChange={(next) => onChange(next as DashboardTimeframe)}
      options={DASHBOARD_TIMEFRAMES.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      placeholder="Select period"
      searchPlaceholder="Search period…"
      align="end"
      triggerPrefix={
        <Calendar
          className={
            compact ? "h-3.5 w-3.5 text-muted-foreground" : "h-4 w-4 text-muted-foreground"
          }
        />
      }
      className={cn(
        compact
          ? "h-8 w-full bg-background text-xs sm:w-[150px]"
          : "w-full bg-background sm:w-[200px]",
        className
      )}
    />
  );
}
