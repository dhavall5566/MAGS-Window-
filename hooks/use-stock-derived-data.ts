"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { buildOutwardConsumptionFromChallans } from "@/lib/challan-consumption";
import {
  buildStockLedgerRows,
  buildStockMasterRows,
  type StockMasterRow,
} from "@/lib/stock-master";
import { enrichChallanVendorDetails } from "@/lib/vendor";
import { useAppStore } from "@/lib/store";
import type { Consumption, StockInward, StockLedgerEntry } from "@/types";

/** Active stock inward rows from the store (respects soft deletes). */
export function useActiveStockInward(): StockInward[] {
  return useAppStore(
    useShallow((state) => {
      const deleted = new Set(state.deletedStockInwardIds ?? []);
      return (state.stockInward ?? []).filter((entry) => !deleted.has(entry.id));
    })
  );
}

/** Outward consumption derived from store challans — single pass, no duplicate API merge. */
export function useOutwardConsumption(): Consumption[] {
  const { challans, vendors } = useAppStore(
    useShallow((state) => ({
      challans: state.challans ?? [],
      vendors: state.vendors ?? [],
    }))
  );

  return useMemo(() => {
    const enriched = challans.map((challan) =>
      enrichChallanVendorDetails(challan, vendors)
    );
    return buildOutwardConsumptionFromChallans(enriched, []);
  }, [challans, vendors]);
}

export function useStockMasterRows(): StockMasterRow[] {
  const inward = useActiveStockInward();
  const consumption = useOutwardConsumption();

  return useMemo(
    () => buildStockMasterRows(inward, consumption),
    [inward, consumption]
  );
}

export function useStockLedgerRows(): StockLedgerEntry[] {
  const inward = useActiveStockInward();
  const consumption = useOutwardConsumption();

  return useMemo(
    () => buildStockLedgerRows(inward, consumption),
    [inward, consumption]
  );
}
