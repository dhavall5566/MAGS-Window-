import { z } from "zod";
import type { Profile } from "@/types";
import { getProfileCodeValue } from "@/lib/profile";

export const PROFILE_FIELD_LABELS = {
  seriesName: "Series Name",
  profileName: "Profile Name",
  rmm: "Length in meter",
  powderCoatingRmm: "RMM (For Powder Coating)",
  rate: "Rate",
  ratePerMeter: "Kg Per Meter",
} as const;

const lengthsInMeterSchema = z.preprocess(
  (value) => {
    if (!Array.isArray(value)) return [];
    return value
      .map((entry) => Number(entry))
      .filter((length) => Number.isFinite(length) && length > 0);
  },
  z
    .array(z.number().min(0.01, "Length must be greater than 0"))
    .min(1, `Add at least one ${PROFILE_FIELD_LABELS.rmm.toLowerCase()}`)
);

export const profileFormSchema = z.object({
  seriesName: z.string().min(1, `${PROFILE_FIELD_LABELS.seriesName} is required`),
  profileCode: z.string().min(1, "Profile code is required"),
  itemName: z.string().min(1, `${PROFILE_FIELD_LABELS.profileName} is required`),
  lengthsInMeter: lengthsInMeterSchema,
  powderCoatingRmm: z.coerce
    .number()
    .min(0, `${PROFILE_FIELD_LABELS.powderCoatingRmm} must be 0 or greater`),
  rate: z.coerce
    .number()
    .min(0, `${PROFILE_FIELD_LABELS.rate} is required`),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

export function normalizeProfileIdentityKey(code: string, name: string): string {
  return `${code.trim().toLowerCase()}::${name.trim().toLowerCase()}`;
}

export function getProfileIdentityKey(
  profile: Pick<Profile, "code" | "seriesName" | "profileNo" | "name">
): string {
  return normalizeProfileIdentityKey(getProfileCodeValue(profile), profile.name);
}

export function isDuplicateProfile(
  code: string,
  name: string,
  existingProfiles: Profile[],
  excludeProfileId?: string
): boolean {
  const key = normalizeProfileIdentityKey(code, name);
  return existingProfiles.some((profile) => {
    if (excludeProfileId && profile.id === excludeProfileId) return false;
    return getProfileIdentityKey(profile) === key;
  });
}

export function createProfileFormSchema(
  existingProfiles: Profile[] = [],
  excludeProfileId?: string
) {
  return profileFormSchema.superRefine((data, ctx) => {
    if (
      isDuplicateProfile(
        data.profileCode,
        data.itemName,
        existingProfiles,
        excludeProfileId
      )
    ) {
      const message = "A profile with this name and code already exists";
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["profileCode"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message,
        path: ["itemName"],
      });
    }
  });
}

export function getProfileLengthsFieldError(
  errors: { lengthsInMeter?: { message?: string; root?: { message?: string } } | Array<{ message?: string } | undefined> },
  isSubmitted: boolean
): string | undefined {
  if (!isSubmitted || !errors.lengthsInMeter) return undefined;
  const field = errors.lengthsInMeter;
  if (typeof field === "object" && field !== null && "message" in field && field.message) {
    return field.message;
  }
  if (typeof field === "object" && field !== null && "root" in field && field.root?.message) {
    return field.root.message;
  }
  if (Array.isArray(field)) {
    return field.find((entry) => entry?.message)?.message;
  }
  return undefined;
}
