"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileImageUploadField } from "@/components/profiles/profile-image-upload-field";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import {
  createProfileFormSchema,
  getProfileLengthsFieldError,
  PROFILE_FIELD_LABELS,
  type ProfileFormData,
} from "@/lib/profile-form";
import { ProfileLengthsEditor } from "@/components/profiles/profile-lengths-editor";
import {
  appendPriceHistory,
  buildProfileFromForm,
  getProfileDesignImage,
  getProfileLengths,
  getProfileRmmValue,
  normalizeProfile,
  calculateRMtrRateFromRmmAndRate,
  RMM_TO_METER_FACTOR,
} from "@/lib/profile";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { getSeriesFormOptions } from "@/lib/series";
import { useAppStore } from "@/lib/store";
import type { Profile } from "@/types";

interface EditProfileDialogProps {
  profile: Profile | null;
  existingProfiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, updates: Partial<Profile>) => void;
}

export function EditProfileDialog({
  profile,
  existingProfiles,
  open,
  onOpenChange,
  onSave,
}: EditProfileDialogProps) {
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const seriesNames = useAppStore((s) => s.seriesNames);

  const seriesOptions = useMemo(
    () => getSeriesFormOptions(seriesNames ?? [], profile?.seriesName),
    [seriesNames, profile?.seriesName]
  );

  const schema = useMemo(
    () => createProfileFormSchema(existingProfiles, profile?.id),
    [existingProfiles, profile?.id]
  );

  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<ProfileFormData>({
    resolver,
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      seriesName: "",
      profileCode: "",
      itemName: "",
      lengthsInMeter: [0],
      powderCoatingRmm: 0,
      rate: 0,
    },
  });

  const lengthsInMeter = watch("lengthsInMeter");
  const rate = watch("rate");
  const selectedSeriesName = watch("seriesName");
  const primaryLength =
    (lengthsInMeter ?? []).map((value) => Number(value)).find((value) => value > 0) ?? 0;
  const rmm = profile
    ? getProfileRmmValue(profile, primaryLength > 0 ? primaryLength : undefined)
    : primaryLength * RMM_TO_METER_FACTOR;
  const ratePerMeter = calculateRMtrRateFromRmmAndRate(rmm, Number(rate) || 0);

  const lengthsError = getProfileLengthsFieldError(errors, isSubmitted);

  useEffect(() => {
    if (!open || !profile) return;

    const lengths = getProfileLengths(profile);
    reset(
      {
        seriesName: profile.seriesName || seriesOptions[0] || "",
        profileCode: profile.code || profile.seriesName,
        itemName: profile.name || profile.designName,
        lengthsInMeter: lengths.length > 0 ? lengths : [profile.rmm].filter((value) => value > 0),
        powderCoatingRmm: profile.powderCoatingRmm ?? 0,
        rate: profile.rate ?? profile.perKgRate ?? 0,
      },
      { keepIsSubmitted: false }
    );
    setDesignPreview(null);
  }, [open, profile, reset, seriesOptions]);

  const onSubmit = (data: ProfileFormData) => {
    if (!profile) return;
    const designImage =
      designPreview !== null ? designPreview : getProfileDesignImage(profile);
    const rebuilt = normalizeProfile(
      buildProfileFromForm(data, designImage, profile.id, profile.createdAt)
    );
    const previousRate = profile.rate ?? profile.perKgRate ?? 0;
    const priceHistory =
      data.rate !== previousRate
        ? appendPriceHistory(profile.priceHistory, previousRate, data.rate)
        : profile.priceHistory ?? [];

    onSave(profile.id, {
      ...rebuilt,
      status: profile.status,
      priceHistory,
      minStock: profile.minStock,
      currentStock: profile.currentStock,
    });
    onOpenChange(false);
  };

  const currentDesign =
    designPreview !== null
      ? designPreview
      : profile
        ? getProfileDesignImage(profile)
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(92dvh,calc(100vh-1.5rem))] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="border-b px-6 py-5 pr-14">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update profile specifications, dimensions, and pricing.
            </DialogDescription>
          </DialogHeader>
        </div>
        {profile ? (
          <form key={profile.id} onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-5">
              <FormSection title="Profile identity">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
                  <ProfileImageUploadField
                    id="edit-design"
                    value={currentDesign || null}
                    onChange={(url) => setDesignPreview(url ?? "")}
                    layout="card"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      label={PROFILE_FIELD_LABELS.seriesName}
                      htmlFor="edit-seriesName"
                      required
                      error={resolveFieldError(isSubmitted, errors.seriesName)}
                    >
                      <SearchableSelect
                        id="edit-seriesName"
                        value={selectedSeriesName || undefined}
                        onValueChange={(value) =>
                          setValue("seriesName", value, { shouldValidate: isSubmitted })
                        }
                        disabled={seriesOptions.length === 0}
                        options={stringSelectOptions(seriesOptions, "font-mono")}
                        placeholder="Select series"
                        searchPlaceholder="Search series…"
                        className="font-mono"
                        aria-invalid={fieldInvalid(isSubmitted, errors.seriesName)}
                      />
                    </FormField>
                    <FormField
                      label="Profile Code"
                      htmlFor="edit-profileCode"
                      required
                      error={resolveFieldError(isSubmitted, errors.profileCode)}
                    >
                      <Input
                        id="edit-profileCode"
                        placeholder="e.g. M25-01"
                        className="font-mono"
                        aria-invalid={fieldInvalid(isSubmitted, errors.profileCode)}
                        {...register("profileCode")}
                      />
                    </FormField>
                    <FormField
                      label={PROFILE_FIELD_LABELS.profileName}
                      htmlFor="edit-itemName"
                      required
                      className="sm:col-span-2"
                      error={resolveFieldError(isSubmitted, errors.itemName)}
                    >
                      <Input
                        id="edit-itemName"
                        aria-invalid={fieldInvalid(isSubmitted, errors.itemName)}
                        {...register("itemName")}
                      />
                    </FormField>
                  </div>
                </div>
              </FormSection>

              <FormSection title="Dimensions & pricing">
                <ProfileLengthsEditor
                  value={lengthsInMeter ?? [0]}
                  onChange={(lengths) =>
                    setValue("lengthsInMeter", lengths, { shouldValidate: isSubmitted })
                  }
                  error={lengthsError}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <FormField
                    label={PROFILE_FIELD_LABELS.rate}
                    htmlFor="edit-rate"
                    required
                    error={resolveFieldError(isSubmitted, errors.rate)}
                  >
                    <Input
                      id="edit-rate"
                      type="number"
                      step="0.01"
                      min="0"
                      className="tabular-nums"
                      aria-invalid={fieldInvalid(isSubmitted, errors.rate)}
                      {...register("rate")}
                    />
                  </FormField>
                  <FormField
                    label={PROFILE_FIELD_LABELS.powderCoatingRmm}
                    htmlFor="edit-powderCoatingRmm"
                    required
                    error={resolveFieldError(isSubmitted, errors.powderCoatingRmm)}
                  >
                    <Input
                      id="edit-powderCoatingRmm"
                      type="number"
                      step="0.01"
                      min="0"
                      className="tabular-nums"
                      aria-invalid={fieldInvalid(isSubmitted, errors.powderCoatingRmm)}
                      {...register("powderCoatingRmm")}
                    />
                  </FormField>
                  <FormField
                    label={PROFILE_FIELD_LABELS.ratePerMeter}
                    htmlFor="edit-ratePerMeter"
                    hint="Calculated from length and rate"
                    className="sm:col-span-2 xl:col-span-1"
                  >
                    <Input
                      id="edit-ratePerMeter"
                      type="number"
                      step="0.01"
                      value={ratePerMeter || ""}
                      disabled
                      readOnly
                      className="bg-muted tabular-nums"
                    />
                  </FormField>
                </div>
              </FormSection>
            </div>

            <div className="border-t bg-muted/20 px-6 py-4">
              <FormDialogActions
                onCancel={() => onOpenChange(false)}
                submitLabel="Save Changes"
                loadingLabel="Saving"
                isSubmitting={isSubmitting}
              />
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
