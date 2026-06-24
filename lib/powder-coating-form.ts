import { z } from "zod";

export const powderCoatingFormSchema = z.object({
  batchNo: z.string().min(1, "Batch number is required"),
  date: z.string().min(1, "Date is required"),
  profileCode: z.string().min(1, "Profile is required"),
  quantity: z.coerce.number().min(1, "Quantity is required"),
  weight: z.coerce.number().min(0, "Weight is required"),
  color: z.string().min(1, "Color is required"),
  vendor: z.string().min(1, "Vendor is required"),
  sentDate: z.string().optional(),
  returnDate: z.string().optional(),
});

export type PowderCoatingFormData = z.infer<typeof powderCoatingFormSchema>;
