export type UserRole = "administrator" | "store_manager" | "production_user";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  department: string;
  status: "active" | "inactive";
  lastLogin?: string;
}

export interface ProfilePriceHistory {
  id: string;
  date: string;
  previousRate: number | null;
  newRate: number;
}

export interface SeriesName {
  id: string;
  name: string;
  seriesNo: string;
  /** Optional text after the series code, e.g. CURTAIN WALL → MCW38 CURTAIN WALL */
  seriesSuffix?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Profile {
  id: string;
  code: string;
  name: string;
  seriesName: string;
  profileNo: string;
  /** Dye code from profile master (e.g. 1001). Legacy imports may use diaCode. */
  dyeCode?: string;
  /** @deprecated Use dyeCode. Kept for backward compatibility with older DB rows. */
  diaCode?: string;
  /** Primary length in meters (MTR). Legacy field name from RMM storage. */
  rmm: number;
  /** RMM value used for powder coating calculations. */
  powderCoatingRmm?: number;
  /** @deprecated Removed from profile master. Legacy rows may still include this. */
  rate?: number;
  ratePerMeter: number;
  category: string;
  alloy: string;
  finish: string;
  weightPerMeter: number;
  standardLength: number;
  image: string;
  design: string;
  designName: string;
  purchaseUnitQty: number;
  purchaseUnitMetric: string;
  conversionUnitQty: number;
  conversionUnitMetric: string;
  /** @deprecated Removed from profile master. Legacy rows may still include this. */
  perKgRate?: number;
  /** @deprecated Removed from profile master. Legacy rows may still include this. */
  priceHistory?: ProfilePriceHistory[];
  description: string;
  minStock: number;
  currentStock: number;
  unit: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface StockInward {
  id: string;
  inwardNo: string;
  invoiceNo?: string;
  date: string;
  supplier: string;
  dyeCode: string;
  profileCode: string;
  profileName: string;
  profileImage?: string;
  /** Total inward weight in kg. */
  totalWeightKg: number;
  /** Length in meters. */
  length: number;
  kgPerMeter: number;
  /** NOS = totalWeight / (length × kgPerMeter). */
  quantity: number;
  /** Alias of totalWeightKg for stock aggregation. */
  weight: number;
  remarks?: string;
  /** Parent inward id when this row was created from a length split. */
  splitFromId?: string;
  /** Parent inward number for display. */
  splitFromInwardNo?: string;
  /** ISO date when the split occurred. */
  splitAt?: string;
  /** Parent rows are marked split and excluded from stock totals. */
  status?: "active" | "split";
  /** @deprecated Removed from stock inward. Legacy rows may still include this. */
  lengthFeet?: number;
  /** @deprecated Removed from stock inward. Legacy rows may still include this. */
  rate?: number;
}

export interface Consumption {
  id: string;
  consumptionNo: string;
  date: string;
  projectName: string;
  profileCode: string;
  profileName: string;
  length: number;
  quantity: number;
  weight: number;
  issuedBy: string;
  challanId?: string;
  challanNumber?: string;
  challanType?: "outward" | "powder_coating" | "return";
}

export type CoatingStatus =
  | "pending"
  | "sent"
  | "in_process"
  | "completed"
  | "returned";

export type CoatingColor =
  | "White"
  | "Black"
  | "Blue"
  | "Yellow"
  | "Green"
  | "Matt Black"
  | "Dark Bronze"
  | "Champagne Gold"
  | "Wood Finish";

export interface PowderCoating {
  id: string;
  batchNo: string;
  date: string;
  profileCode: string;
  profileName: string;
  quantity: number;
  weight: number;
  color: CoatingColor;
  vendor: string;
  sentDate?: string;
  returnDate?: string;
}

export interface Scrap {
  id: string;
  scrapNo: string;
  date: string;
  profileCode: string;
  profileName: string;
  quantity: number;
  weight: number;
  reason: string;
  disposition: string;
}

export type VendorType = "delivery" | "powder_coating" | "outward_challan";

export interface Vendor {
  id: string;
  partyName: string;
  partyAddress: string;
  personName: string;
  phoneNo: string;
  email: string;
  gstNo?: string;
  vendorType: VendorType;
  /** PDF header company name for outward challan issuer. */
  challanHeaderName?: string;
  challanAddressLine1?: string;
  challanAddressLine2?: string;
  challanEmail?: string;
  challanPhone?: string;
  challanSignatoryLine?: string;
}

export interface ChallanItem {
  profileCode: string;
  profileName: string;
  profileImage: string;
  length: number;
  qty: number;
  weight: number;
  /** R MTR RATE (₹/m) on powder coating challan line items. */
  rate?: number;
}

export interface ChallanVendorDetails {
  vendorName: string;
  vendorAddress?: string;
  vendorGstNo?: string;
  vendorPersonName?: string;
  vendorContact?: string;
}

export interface OutwardChallan extends ChallanVendorDetails {
  id: string;
  challanNumber: string;
  date: string;
  vehicleNumber: string;
  driverName: string;
  projectName?: string;
  totalBundles?: number;
  totalWeightManual?: number;
  /** Sum of all line item profile weights (kg). */
  totalWeightAllProfiles?: number;
  totalNoOfProfiles?: number;
  outwardChallanVendorId?: string;
  outwardChallanVendorName?: string;
  /** @deprecated Legacy outward field — migrated to projectName. */
  remarks?: string;
  items: ChallanItem[];
  type: "outward";
}

export interface PowderCoatingChallan extends ChallanVendorDetails {
  id: string;
  challanNumber: string;
  date: string;
  vehicleNumber: string;
  driverName: string;
  projectName?: string;
  /** @deprecated Legacy powder coating field — migrated to projectName. */
  remarks?: string;
  items: ChallanItem[];
  color: CoatingColor;
  /** Manual Rate used in R MTR RATE formula (replaces profile KG/MTR). */
  coatingRate?: number;
  type: "powder_coating";
  sourceOutwardChallanId?: string;
  sourceOutwardChallanNumber?: string;
}

export interface ReturnChallan extends ChallanVendorDetails {
  id: string;
  challanNumber: string;
  date: string;
  vehicleNumber: string;
  driverName: string;
  remarks?: string;
  items: ChallanItem[];
  type: "return";
}

export type Challan = OutwardChallan | PowderCoatingChallan | ReturnChallan;

export interface PurchaseOrderItem {
  dyeCode?: string;
  profileCode: string;
  profileName: string;
  profileImage: string;
  /** Weight per running meter (KG/MTR). */
  kgPerMeter: number;
  /** Unit of measure for length, e.g. "MM". */
  uom: string;
  /** Profile length in millimeters. */
  length: number;
  qty: number;
  /** Total ordered weight in kg. */
  totalWeightKg: number;
}

export interface PurchaseOrder {
  id: string;
  /** Document number (shown as "D.C. No" on the PO). */
  poNumber: string;
  date: string;
  vendorName: string;
  vendorAddress: string;
  gstNo?: string;
  personName?: string;
  contactNo?: string;
  remarks?: string;
  items: PurchaseOrderItem[];
}

export interface StockLedgerEntry {
  id: string;
  date: string;
  profileCode: string;
  profileName: string;
  type: "inward" | "consumption" | "coating_sent" | "coating_return" | "scrap" | "adjustment";
  reference: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  /** Movement weight in kg (alias: totalWeightKg). */
  weight: number;
  totalWeightKg: number;
  length: number;
  kgPerMeter: number;
  totalProfiles: number;
}

export interface DashboardStats {
  totalProfiles: number;
  availableStock: number;
  lowStockProfiles: number;
  totalConsumption?: number;
  pendingCoating: number;
  completedCoating: number;
  scrapQuantity: number;
}

export type ReportType =
  | "stock_movement"
  | "consumption"
  | "coating"
  | "inventory"
  | "summary";

export interface Report {
  id: string;
  reportNo: string;
  name: string;
  type: ReportType;
  dateFrom: string;
  dateTo: string;
  createdAt: string;
  status: "generated";
}

export interface DashboardTransaction {
  id: string;
  date: string;
  type: string;
  reference: string;
  profileCode: string;
  profileName: string;
  quantity: number;
  weight?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  read: boolean;
  createdAt: string;
}
