"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileImageUploadField } from "@/components/profiles/profile-image-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
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
  const ratePerMeter = calculateRMtrRateFromRmmAndRate(
    rmm,
    Number(rate) || 0
  );

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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update profile specifications, dimensions, and pricing.</DialogDescription>
        </DialogHeader>
        {profile ? (
          <form key={profile.id} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-seriesName">{PROFILE_FIELD_LABELS.seriesName}</Label>
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
                />
                {isSubmitted && errors.seriesName && (
                  <p className="text-sm text-destructive">{errors.seriesName.message}</p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-profileCode">Profile Code</Label>
                <Input
                  id="edit-profileCode"
                  placeholder="e.g. M25-01"
                  className="font-mono"
                  {...register("profileCode")}
                />
                {isSubmitted && errors.profileCode && (
                  <p className="text-sm text-destructive">{errors.profileCode.message}</p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-itemName">{PROFILE_FIELD_LABELS.profileName}</Label>
                <Input id="edit-itemName" {...register("itemName")} />
                {isSubmitted && errors.itemName && (
                  <p className="text-sm text-destructive">{errors.itemName.message}</p>
                )}
              </div>
              <ProfileImageUploadField
                id="edit-design"
                value={currentDesign || null}
                onChange={(url) => setDesignPreview(url ?? "")}
              />
              <ProfileLengthsEditor
                value={lengthsInMeter ?? [0]}
                onChange={(lengths) =>
                  setValue("lengthsInMeter", lengths, { shouldValidate: isSubmitted })
                }
                error={lengthsError}
              />
              <div className="space-y-2">
                <Label htmlFor="edit-rate">{PROFILE_FIELD_LABELS.rate}</Label>
                <Input id="edit-rate" type="number" step="0.01" min="0" {...register("rate")} />
                {isSubmitted && errors.rate && (
                  <p className="text-sm text-destructive">{errors.rate.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-powderCoatingRmm">
                  {PROFILE_FIELD_LABELS.powderCoatingRmm}
                </Label>
                <Input
                  id="edit-powderCoatingRmm"
                  type="number"
                  step="0.01"
                  min="0"
                  className="tabular-nums"
                  {...register("powderCoatingRmm")}
                />
                {isSubmitted && errors.powderCoatingRmm && (
                  <p className="text-sm text-destructive">{errors.powderCoatingRmm.message}</p>
                )}
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="edit-ratePerMeter">{PROFILE_FIELD_LABELS.ratePerMeter}</Label>
                <Input
                  id="edit-ratePerMeter"
                  type="number"
                  step="0.01"
                  value={ratePerMeter || ""}
                  disabled
                  readOnly
                />
              </div>
            </div>
            <FormDialogActions
              onCancel={() => onOpenChange(false)}
              submitLabel="Save Changes"
              loadingLabel="Saving"
              isSubmitting={isSubmitting}
            />
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
