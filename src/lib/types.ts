export type UserRole = "ADMINISTRATOR" | "STORE_MANAGER" | "PRODUCTION_USER";
export type UserStatus = "ACTIVE" | "INACTIVE";
export type ProfileStatus = "ACTIVE" | "INACTIVE";
export type PowderCoatingStatus =
  | "PENDING"
  | "SENT_FOR_COATING"
  | "IN_PROCESS"
  | "COMPLETED"
  | "RETURNED";
export type PowderCoatingColor =
  | "WHITE"
  | "BLACK"
  | "MATT_BLACK"
  | "DARK_BRONZE"
  | "CHAMPAGNE_GOLD"
  | "WOOD_FINISH";
export type ConsumptionUnit = "METER" | "FEET";
export type TransactionType =
  | "STOCK_INWARD"
  | "MATERIAL_CONSUMPTION"
  | "POWDER_COATING_TRANSFER"
  | "POWDER_COATING_RECEIPT"
  | "SCRAP_ENTRY"
  | "STOCK_ADJUSTMENT"
  | "CHALLAN_OUTWARD"
  | "CHALLAN_RETURN";
export type ChallanType = "OUTWARD" | "POWDER_COATING" | "RETURN";
export type ChallanStatus =
  | "DRAFT"
  | "ISSUED"
  | "SENT_FOR_COATING"
  | "IN_PROCESS"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED";
export type ScrapReason =
  | "CUTTING_WASTE"
  | "DAMAGED_MATERIAL"
  | "REJECTED_PROFILES"
  | "PRODUCTION_LOSS";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  profileCode: string;
  profileName: string;
  seriesName: string;
  weightPerMeter: number;
  standardLength: number;
  imageUrl?: string | null;
  technicalDrawingUrl?: string | null;
  description?: string | null;
  status: ProfileStatus;
  currentStock: number;
  powderCoatedStock: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface StockInward {
  id: string;
  profileId: string;
  quantity: number;
  length?: number | null;
  weight: number;
  date: string;
  remarks?: string | null;
  createdAt: string;
}

export interface Consumption {
  id: string;
  profileId: string;
  quantity: number;
  unit: ConsumptionUnit;
  calculatedWeight: number;
  date: string;
  remarks?: string | null;
  createdAt: string;
}

export interface PowderCoating {
  id: string;
  profileId: string;
  quantity: number;
  weight: number;
  color: PowderCoatingColor;
  transferDate: string;
  status: PowderCoatingStatus;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapWaste {
  id: string;
  profileId: string;
  quantity: number;
  reason: ScrapReason;
  remarks?: string | null;
  date: string;
  createdAt: string;
}

export interface StockLedger {
  id: string;
  profileId: string;
  transactionType: TransactionType;
  quantity: number;
  balance: number;
  userId: string;
  date: string;
  remarks?: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  gstin?: string | null;
  status: ProfileStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProfile {
  id: string;
  projectId: string;
  profileId: string;
  plannedQty: number;
  plannedLength?: number | null;
  remarks?: string | null;
}

export interface Project {
  id: string;
  projectCode: string;
  projectName: string;
  clientName?: string | null;
  siteAddress?: string | null;
  status: ProfileStatus;
  startDate?: string | null;
  endDate?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallanItem {
  id: string;
  challanId: string;
  profileId: string;
  quantity: number;
  length?: number | null;
  weight: number;
  remarks?: string | null;
}

export interface Challan {
  id: string;
  challanNumber: string;
  type: ChallanType;
  status: ChallanStatus;
  vendorId?: string | null;
  projectId?: string | null;
  parentChallanId?: string | null;
  color?: PowderCoatingColor | null;
  issueDate: string;
  expectedReturnDate?: string | null;
  receivedDate?: string | null;
  vehicleNo?: string | null;
  driverName?: string | null;
  remarks?: string | null;
  verifiedToken: string;
  preparedBy?: string | null;
  approvedBy?: string | null;
  receivedBy?: string | null;
  totalWeight: number;
  totalQty: number;
  createdAt: string;
  updatedAt: string;
}

export interface Database {
  users: User[];
  profiles: Profile[];
  stockInwards: StockInward[];
  consumptions: Consumption[];
  powderCoatings: PowderCoating[];
  scrapWastes: ScrapWaste[];
  stockLedgers: StockLedger[];
  activityLogs: ActivityLog[];
  notifications: Notification[];
  vendors: Vendor[];
  projects: Project[];
  projectProfiles: ProjectProfile[];
  challans: Challan[];
  challanItems: ChallanItem[];
}
