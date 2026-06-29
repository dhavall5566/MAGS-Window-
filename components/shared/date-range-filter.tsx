"use client";

import { Fragment, useCallback, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { matchesDateRange } from "@/lib/date-filter";
import { cn } from "@/lib/utils";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  label = "Date",
  className,
}: DateRangeFilterProps) {
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        type="date"
        aria-label={`${label} from`}
        value={dateFrom}
        onChange={(event) => onDateFromChange(event.target.value)}
        className="h-10 w-full min-w-0 bg-background sm:w-[150px]"
      />
      <span className="text-xs text-muted-foreground">to</span>
      <Input
        type="date"
        aria-label={`${label} to`}
        value={dateTo}
        min={dateFrom || undefined}
        onChange={(event) => onDateToChange(event.target.value)}
        className="h-10 w-full min-w-0 bg-background sm:w-[150px]"
      />
    </div>
  );
}

export function useDateRangeFilter(options?: { label?: string }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtersActive = Boolean(dateFrom || dateTo);

  const clearFilters = useCallback(() => {
    setDateFrom("");
    setDateTo("");
  }, []);

  const matchesDate = useCallback(
    (value: string | Date | null | undefined) =>
      matchesDateRange(value, dateFrom, dateTo),
    [dateFrom, dateTo]
  );

  const filterContent = (
    <DateRangeFilter
      dateFrom={dateFrom}
      dateTo={dateTo}
      onDateFromChange={setDateFrom}
      onDateToChange={setDateTo}
      label={options?.label}
    />
  );

  return {
    dateFrom,
    dateTo,
    filtersActive,
    clearFilters,
    matchesDate,
    filterContent,
    setDateFrom,
    setDateTo,
  };
}

export function combineTableFilters(...sections: ReactNode[]) {
  const visible = sections.filter(Boolean);
  if (visible.length === 0) return undefined;
  if (visible.length === 1) return visible[0];

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
      {visible.map((section, index) => (
        <Fragment key={index}>{section}</Fragment>
      ))}
    </div>
  );
}
