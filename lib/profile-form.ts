import { z } from "zod";
import type { Profile } from "@/types";
import { getProfileCodeValue } from "@/lib/profile";

export const PROFILE_FIELD_LABELS = {
  seriesName: "Series Name",
  profileName: "Profile Name",
  dyeCode: "Dye Code",
  powderCoatingRmm: "RMM (For Powder Coating)",
  kgPerMeter: "Kg Per Meter",
} as const;

export const profileFormSchema = z.object({
  seriesName: z.string().min(1, `${PROFILE_FIELD_LABELS.seriesName} is required`),
  profileCode: z.string().min(1, "Profile code is required"),
  dyeCode: z.string().optional().default(""),
  itemName: z.string().min(1, `${PROFILE_FIELD_LABELS.profileName} is required`),
  powderCoatingRmm: z.coerce
    .number()
    .min(0, `${PROFILE_FIELD_LABELS.powderCoatingRmm} must be 0 or greater`),
  kgPerMeter: z.coerce
    .number()
    .min(0, `${PROFILE_FIELD_LABELS.kgPerMeter} must be 0 or greater`),
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
