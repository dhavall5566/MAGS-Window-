export type RecordModuleKey =
  | "stock-inward"
  | "purchase-orders"
  | "challans-outward"
  | "challans-powder-coating"
  | "challans-return"
  | "powder-coating";

const MODULE_PATH: Record<RecordModuleKey, string> = {
  "stock-inward": "/stock-inward",
  "purchase-orders": "/purchase-orders",
  "challans-outward": "/challans",
  "challans-powder-coating": "/challans",
  "challans-return": "/challans",
  "powder-coating": "/powder-coating",
};

const MODULE_TAB: Partial<Record<RecordModuleKey, string>> = {
  "challans-outward": "outward",
  "challans-powder-coating": "powder_coating",
  "challans-return": "all",
};

export function buildRecordHref(
  module: RecordModuleKey,
  recordId: string,
  label?: string
): string {
  const params = new URLSearchParams();
  params.set("record", recordId);
  if (label?.trim()) {
    params.set("q", label.trim());
  }
  const tab = MODULE_TAB[module];
  if (tab) {
    params.set("tab", tab);
  }
  return `${MODULE_PATH[module]}?${params.toString()}`;
}
