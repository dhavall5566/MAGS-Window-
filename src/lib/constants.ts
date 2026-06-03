export const POWDER_COLORS = [
  { value: "WHITE", label: "White" },
  { value: "BLACK", label: "Black" },
  { value: "MATT_BLACK", label: "Matt Black" },
  { value: "DARK_BRONZE", label: "Dark Bronze" },
  { value: "CHAMPAGNE_GOLD", label: "Champagne Gold" },
  { value: "WOOD_FINISH", label: "Wood Finish" },
] as const;

export const POWDER_STATUSES = [
  { value: "PENDING", label: "Pending" },
  { value: "SENT_FOR_COATING", label: "Sent for Coating" },
  { value: "IN_PROCESS", label: "In Process" },
  { value: "COMPLETED", label: "Completed" },
  { value: "RETURNED", label: "Returned" },
] as const;

export const SCRAP_REASONS = [
  { value: "CUTTING_WASTE", label: "Cutting Waste" },
  { value: "DAMAGED_MATERIAL", label: "Damaged Material" },
  { value: "REJECTED_PROFILES", label: "Rejected Profiles" },
  { value: "PRODUCTION_LOSS", label: "Production Loss" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "CHALLAN_OUTWARD", label: "Challan Outward" },
  { value: "CHALLAN_RETURN", label: "Challan Return" },
  { value: "STOCK_INWARD", label: "Stock Inward" },
  { value: "MATERIAL_CONSUMPTION", label: "Material Consumption" },
  { value: "POWDER_COATING_TRANSFER", label: "Powder Coating Transfer" },
  { value: "POWDER_COATING_RECEIPT", label: "Powder Coating Receipt" },
  { value: "SCRAP_ENTRY", label: "Scrap Entry" },
  { value: "STOCK_ADJUSTMENT", label: "Stock Adjustment" },
] as const;

export const USER_ROLES = [
  { value: "ADMINISTRATOR", label: "Administrator" },
  { value: "STORE_MANAGER", label: "Store Manager" },
  { value: "PRODUCTION_USER", label: "Production User" },
] as const;
