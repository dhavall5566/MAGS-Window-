"use client";

import { useMemo } from "react";
import { useDateRangeFilter } from "@/components/shared/date-range-filter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, type Column } from "@/components/shared/data-table";
import { formatPerKgRate, getProfileDisplayName } from "@/lib/profile";
import { formatDate } from "@/lib/utils";
import type { Profile, ProfilePriceHistory } from "@/types";

interface ProfilePriceHistoryDialogProps {
  profile: Profile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PriceHistoryRow = ProfilePriceHistory & { id: string };

export function ProfilePriceHistoryDialog({
  profile,
  open,
  onOpenChange,
}: ProfilePriceHistoryDialogProps) {
  const history = useMemo(
    () =>
      [...(profile?.priceHistory ?? [])]
        .filter((entry) => entry && typeof entry.newRate === "number")
        .sort(
          (a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
        )
        .map((entry, index) => ({
          ...entry,
          id: entry.id ?? `${entry.date}-${entry.newRate}-${index}`,
        })),
    [profile?.priceHistory]
  );

  const {
    filterContent: dateFilterContent,
    filtersActive: dateFiltersActive,
    clearFilters: clearDateFilters,
    matchesDate,
  } = useDateRangeFilter();

  const filteredHistory = useMemo(
    () => history.filter((row) => matchesDate(row.date)),
    [history, matchesDate]
  );

  const columns = useMemo<Column<PriceHistoryRow>[]>(
    () => [
      {
        key: "date",
        header: "Date",
        render: (row) => formatDate(row.date),
      },
      {
        key: "previousRate",
        header: "Previous Rate",
        render: (row) =>
          row.previousRate == null ? "—" : formatPerKgRate(row.previousRate),
      },
      {
        key: "newRate",
        header: "New Rate",
        className: "font-medium",
        render: (row) => formatPerKgRate(row.newRate),
      },
    ],
    []
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Price History — {profile ? getProfileDisplayName(profile) : ""}
          </DialogTitle>
        </DialogHeader>
        <DataTable
          tableId="profile-price-history"
          data={filteredHistory}
          columns={columns}
          emptyMessage="No price changes recorded yet."
          showResultCount={false}
          pagination={filteredHistory.length > 10}
          defaultPageSize={10}
          filterContent={dateFilterContent}
          filtersActive={dateFiltersActive}
          onClearFilters={clearDateFilters}
        />
      </DialogContent>
    </Dialog>
  );
}
