"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProfileImageUploadField } from "@/components/profiles/profile-image-upload-field";
import { SeriesNameSelect } from "@/components/profiles/series-name-select";
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
import {
  createProfileFormSchema,
  PROFILE_FIELD_LABELS,
  type ProfileFormData,
} from "@/lib/profile-form";
import {
  buildProfileFromForm,
  getProfileCodeValue,
  getProfileDesignImage,
  getProfileDyeCode,
  getProfileWeightPerMeter,
  normalizeProfile,
} from "@/lib/profile";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { getActiveSeriesLabels } from "@/lib/series";
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
  const fallbackSeriesName = useMemo(
    () => getActiveSeriesLabels(seriesNames ?? [])[0] ?? "",
    [seriesNames]
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
      dyeCode: "",
      itemName: "",
      powderCoatingRmm: 0,
      kgPerMeter: 0,
    },
  });

  const selectedSeriesName = watch("seriesName");

  useEffect(() => {
    if (!open || !profile) return;

    reset(
      {
        seriesName: profile.seriesName || fallbackSeriesName,
        profileCode: getProfileCodeValue(profile),
        dyeCode: getProfileDyeCode(profile),
        itemName: profile.name || profile.designName,
        powderCoatingRmm: profile.powderCoatingRmm ?? 0,
        kgPerMeter: getProfileWeightPerMeter(profile),
      },
      { keepIsSubmitted: false }
    );
    setDesignPreview(null);
  }, [open, profile, reset, fallbackSeriesName]);

  const onSubmit = (data: ProfileFormData) => {
    if (!profile) return;
    const designImage =
      designPreview !== null ? designPreview : getProfileDesignImage(profile);
    const rebuilt = normalizeProfile(
      buildProfileFromForm(data, designImage, profile.id, profile.createdAt)
    );

    onSave(profile.id, {
      ...rebuilt,
      status: profile.status,
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
              Update profile specifications and dimensions.
            </DialogDescription>
          </DialogHeader>
        </div>
        {profile ? (
          <form key={profile.id} onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <FormSection title="Profile details">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,168px)_minmax(0,1fr)] lg:items-start">
                  <ProfileImageUploadField
                    id="edit-design"
                    value={currentDesign || null}
                    onChange={(url) => setDesignPreview(url ?? "")}
                    layout="compact"
                    className="mx-auto w-full max-w-[168px] lg:mx-0"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <FormField
                      label={PROFILE_FIELD_LABELS.seriesName}
                      htmlFor="edit-seriesName"
                      required
                      className="sm:col-span-2 xl:col-span-2"
                      error={resolveFieldError(isSubmitted, errors.seriesName)}
                    >
                      <SeriesNameSelect
                        id="edit-seriesName"
                        value={selectedSeriesName}
                        onValueChange={(value) =>
                          setValue("seriesName", value, { shouldValidate: isSubmitted })
                        }
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
                      label={PROFILE_FIELD_LABELS.dyeCode}
                      htmlFor="edit-dyeCode"
                      error={resolveFieldError(isSubmitted, errors.dyeCode)}
                    >
                      <Input
                        id="edit-dyeCode"
                        placeholder="e.g. 1001"
                        className="font-mono"
                        aria-invalid={fieldInvalid(isSubmitted, errors.dyeCode)}
                        {...register("dyeCode")}
                      />
                    </FormField>
                    <FormField
                      label={PROFILE_FIELD_LABELS.profileName}
                      htmlFor="edit-itemName"
                      required
                      className="sm:col-span-2 xl:col-span-4"
                      error={resolveFieldError(isSubmitted, errors.itemName)}
                    >
                      <Input
                        id="edit-itemName"
                        aria-invalid={fieldInvalid(isSubmitted, errors.itemName)}
                        {...register("itemName")}
                      />
                    </FormField>
                    <FormField
                      label={PROFILE_FIELD_LABELS.powderCoatingRmm}
                      htmlFor="edit-powderCoatingRmm"
                      required
                      className="sm:col-span-1 xl:col-span-2"
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
                      label={PROFILE_FIELD_LABELS.kgPerMeter}
                      htmlFor="edit-kgPerMeter"
                      required
                      className="sm:col-span-1 xl:col-span-2"
                      error={resolveFieldError(isSubmitted, errors.kgPerMeter)}
                    >
                      <Input
                        id="edit-kgPerMeter"
                        type="number"
                        step="0.0001"
                        min="0"
                        className="tabular-nums"
                        aria-invalid={fieldInvalid(isSubmitted, errors.kgPerMeter)}
                        {...register("kgPerMeter")}
                      />
                    </FormField>
                  </div>
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
