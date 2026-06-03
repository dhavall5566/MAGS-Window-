import { z } from "zod";

export const profileSchema = z.object({
  profileCode: z.string().min(1, "Profile code required"),
  profileName: z.string().min(1, "Profile name required"),
  seriesName: z.string().min(1, "Series name required"),
  weightPerMeter: z.coerce.number().positive("Weight must be positive"),
  standardLength: z.coerce.number().positive().default(6),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  technicalDrawingUrl: z.string().optional(),
  lowStockThreshold: z.coerce.number().min(0).default(50),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const stockInwardSchema = z.object({
  profileId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  length: z.coerce.number().optional(),
  weight: z.coerce.number().positive(),
  date: z.string().optional(),
  remarks: z.string().optional(),
});

export const consumptionSchema = z.object({
  profileId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.enum(["METER", "FEET"]),
  date: z.string().optional(),
  remarks: z.string().optional(),
});

export const powderCoatingSchema = z.object({
  profileId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  weight: z.coerce.number().positive(),
  color: z.enum([
    "WHITE",
    "BLACK",
    "MATT_BLACK",
    "DARK_BRONZE",
    "CHAMPAGNE_GOLD",
    "WOOD_FINISH",
  ]),
  transferDate: z.string().optional(),
  status: z
    .enum([
      "PENDING",
      "SENT_FOR_COATING",
      "IN_PROCESS",
      "COMPLETED",
      "RETURNED",
    ])
    .default("PENDING"),
  remarks: z.string().optional(),
});

export const scrapSchema = z.object({
  profileId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  reason: z.enum([
    "CUTTING_WASTE",
    "DAMAGED_MATERIAL",
    "REJECTED_PROFILES",
    "PRODUCTION_LOSS",
  ]),
  date: z.string().optional(),
  remarks: z.string().optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1),
  contactPerson: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  gstin: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export const projectSchema = z.object({
  projectCode: z.string().min(1),
  projectName: z.string().min(1),
  clientName: z.string().optional(),
  siteAddress: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  remarks: z.string().optional(),
});

export const challanItemSchema = z.object({
  profileId: z.string().min(1),
  quantity: z.coerce.number().positive(),
  length: z.coerce.number().optional(),
  weight: z.coerce.number().positive(),
  remarks: z.string().optional(),
});

export const challanSchema = z.object({
  type: z.enum(["OUTWARD", "POWDER_COATING", "RETURN"]),
  vendorId: z.string().optional(),
  projectId: z.string().optional(),
  parentChallanId: z.string().optional(),
  color: z
    .enum([
      "WHITE",
      "BLACK",
      "MATT_BLACK",
      "DARK_BRONZE",
      "CHAMPAGNE_GOLD",
      "WOOD_FINISH",
    ])
    .optional(),
  status: z
    .enum([
      "DRAFT",
      "ISSUED",
      "SENT_FOR_COATING",
      "IN_PROCESS",
      "RETURNED",
      "COMPLETED",
      "CANCELLED",
    ])
    .optional(),
  issueDate: z.string().optional(),
  expectedReturnDate: z.string().optional(),
  vehicleNo: z.string().optional(),
  driverName: z.string().optional(),
  remarks: z.string().optional(),
  preparedBy: z.string().optional(),
  approvedBy: z.string().optional(),
  receivedBy: z.string().optional(),
  items: z.array(challanItemSchema).min(1),
  issueNow: z.boolean().optional(),
  completeReturn: z.boolean().optional(),
});

export const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMINISTRATOR", "STORE_MANAGER", "PRODUCTION_USER"]),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
