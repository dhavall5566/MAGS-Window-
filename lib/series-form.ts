import { z } from "zod";

export const seriesFormSchema = z.object({
  name: z
    .string()
    .length(2, "Series name must be exactly 2 letters")
    .regex(/^[A-Za-z]{2}$/, "Only alphabets allowed"),
  seriesNo: z
    .string()
    .min(1, "Series no. is required")
    .regex(/^\d+$/, "Only numbers allowed"),
});

export type SeriesFormData = z.infer<typeof seriesFormSchema>;
