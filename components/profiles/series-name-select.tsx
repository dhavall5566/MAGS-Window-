"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AddSeriesDialog } from "@/components/series/add-series-dialog";
import { Button } from "@/components/ui/button";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import { getSeriesFormOptions, getSeriesLabel } from "@/lib/series";
import { useAppStore } from "@/lib/store";
import type { SeriesName } from "@/types";

interface SeriesNameSelectProps {
  id?: string;
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  "aria-invalid"?: boolean | "true" | "false";
}

export function SeriesNameSelect({
  id,
  value,
  onValueChange,
  placeholder = "Select series",
  className,
  "aria-invalid": ariaInvalid,
}: SeriesNameSelectProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const seriesNames = useAppStore((s) => s.seriesNames);
  const addSeriesName = useAppStore((s) => s.addSeriesName);

  const seriesOptions = useMemo(
    () => getSeriesFormOptions(seriesNames ?? [], value),
    [seriesNames, value]
  );

  const handleSaveSeries = (series: SeriesName) => {
    addSeriesName(series);
    onValueChange(getSeriesLabel(series));
    setCreateOpen(false);
  };

  return (
    <>
      <SearchableSelect
        id={id}
        value={value || undefined}
        onValueChange={onValueChange}
        options={stringSelectOptions(seriesOptions, "font-mono")}
        placeholder={placeholder}
        searchPlaceholder="Search series…"
        className={className}
        aria-invalid={ariaInvalid}
        footer={({ close }) => (
          <Button
            type="button"
            variant="ghost"
            className="h-9 w-full justify-start gap-2 px-3 font-normal"
            onClick={() => {
              close();
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Series
          </Button>
        )}
      />
      <AddSeriesDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        showTrigger={false}
        onSave={handleSaveSeries}
      />
    </>
  );
}
