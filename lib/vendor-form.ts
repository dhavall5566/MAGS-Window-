import { z } from "zod";
import type { VendorType } from "@/types";

export const vendorTypeSchema = z.enum(["delivery", "powder_coating"]);

export const vendorFormSchema = z.object({
  partyName: z.string().min(1, "Party name is required"),
  partyAddress: z.string().min(1, "Party address is required"),
  personName: z.string().optional(),
  phoneNo: z
    .string()
    .optional()
    .refine(
      (value) => !value || /^[\d\s+\-()]{7,20}$/.test(value),
      "Enter a valid phone number"
    ),
  email: z
    .string()
    .optional()
    .refine(
      (value) => !value || z.string().email().safeParse(value).success,
      "Enter a valid email address"
    ),
  vendorType: vendorTypeSchema,
});

export type VendorFormData = z.infer<typeof vendorFormSchema>;

export const VENDOR_TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: "delivery", label: "Delivery" },
  { value: "powder_coating", label: "Powder Coating" },
];
