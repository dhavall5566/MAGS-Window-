/**
 * Exports MAGS-Window mock data to JSON for the FastAPI backend seed script.
 * Run: npx tsx scripts/export-seed-data.ts
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

import { mockChallans } from "../lib/mock-data/challans";
import { mockConsumption } from "../lib/mock-data/consumption";
import {
  MOCK_DASHBOARD_STATS,
  MOCK_RECENT_TRANSACTIONS,
  dashboardCharts,
  mockNotifications,
} from "../lib/mock-data/dashboard-stats";
import { mockPowderCoating } from "../lib/mock-data/powder-coating";
import { mockProfiles } from "../lib/mock-data/profiles";
import {
  colorDistribution,
  consumptionTrends,
  inventoryByCategory,
  monthlyStockMovement,
  reportSummary,
} from "../lib/mock-data/reports";
import { mockScrap } from "../lib/mock-data/scrap";
import { mockStockInward, mockStockLedger } from "../lib/mock-data/stock";
import { mockUsers } from "../lib/mock-data/users";
import { mockVendors } from "../lib/mock-data/vendors";
import { deriveSeriesNamesFromProfiles } from "../lib/series";

const outDir = join(__dirname, "../../Api-MAGS-devansh-main/seed/data");
mkdirSync(outDir, { recursive: true });

const files: Record<string, unknown> = {
  profiles: mockProfiles,
  users: mockUsers,
  vendors: mockVendors,
  series: deriveSeriesNamesFromProfiles(mockProfiles),
  stock_inward: mockStockInward,
  stock_ledger: mockStockLedger,
  consumption: mockConsumption,
  powder_coating: mockPowderCoating,
  scrap: mockScrap,
  challans: mockChallans,
  dashboard_stats: MOCK_DASHBOARD_STATS,
  dashboard_charts: dashboardCharts,
  notifications: mockNotifications,
  recent_transactions: MOCK_RECENT_TRANSACTIONS,
  monthlyStockMovement,
  consumptionTrends,
  colorDistribution,
  inventoryByCategory,
  reportSummary,
};

for (const [name, data] of Object.entries(files)) {
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(data, null, 2));
  console.log(`Wrote ${name}.json`);
}

console.log(`\nExported ${Object.keys(files).length} files to ${outDir}`);
