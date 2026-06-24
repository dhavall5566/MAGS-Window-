export interface AppSettings {
  defaultChallanLength: number;
  lowStockThresholdKg: number;
  highlightLowStock: boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultChallanLength: 6,
  lowStockThresholdKg: 50,
  highlightLowStock: true,
};
