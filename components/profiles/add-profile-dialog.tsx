"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { ProfileImageUploadField } from "@/components/profiles/profile-image-upload-field";
import { ProfileLengthsEditor } from "@/components/profiles/profile-lengths-editor";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import {
  createProfileFormSchema,
  getProfileLengthsFieldError,
  PROFILE_FIELD_LABELS,
  type ProfileFormData,
} from "@/lib/profile-form";
import { buildProfileFromForm, previewRMtrRateFromLengthAndRate } from "@/lib/profile";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { getActiveSeriesLabels } from "@/lib/series";
import { useAppStore } from "@/lib/store";
import { generateId } from "@/lib/utils";
import type { Profile } from "@/types";

interface AddProfileDialogProps {
  existingProfiles: Profile[];
  onSave: (profile: Profile) => void;
}

export function AddProfileDialog({ existingProfiles, onSave }: AddProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [designPreview, setDesignPreview] = useState<string | null>(null);
  const seriesNames = useAppStore((s) => s.seriesNames);

  const seriesOptions = useMemo(
    () => getActiveSeriesLabels(seriesNames ?? []),
    [seriesNames]
  );

  const schema = useMemo(
    () => createProfileFormSchema(existingProfiles),
    [existingProfiles]
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(schema),
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
  const ratePerMeter = previewRMtrRateFromLengthAndRate(primaryLength, Number(rate) || 0);

  const closeDialog = () => {
    setOpen(false);
    reset({
      seriesName: seriesOptions[0] ?? "",
      profileCode: "",
      itemName: "",
      lengthsInMeter: [0],
      powderCoatingRmm: 0,
      rate: 0,
    });
    setDesignPreview(null);
  };

  const onSubmit = (data: ProfileFormData) => {
    onSave(buildProfileFromForm(data, designPreview ?? "", generateId("prf")));
    closeDialog();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setOpen(true);
          reset({
            seriesName: seriesOptions[0] ?? "",
            profileCode: "",
            itemName: "",
            lengthsInMeter: [0],
            powderCoatingRmm: 0,
            rate: 0,
          });
        } else {
          closeDialog();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Profile</DialogTitle>
          <DialogDescription>
            Register an aluminium extrusion profile with dimensions, rate, and optional image.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormSection title="Profile identity">
            <FormField
              label={PROFILE_FIELD_LABELS.seriesName}
              htmlFor="seriesName"
              required
              error={resolveFieldError(isSubmitted, errors.seriesName)}
              hint={
                seriesOptions.length === 0
                  ? "Add a series in Series Name before creating profiles."
                  : undefined
              }
            >
              <SearchableSelect
                id="seriesName"
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
              htmlFor="profileCode"
              required
              error={resolveFieldError(isSubmitted, errors.profileCode)}
            >
              <Input
                id="profileCode"
                placeholder="e.g. M25-01"
                className="font-mono"
                aria-invalid={fieldInvalid(isSubmitted, errors.profileCode)}
                {...register("profileCode")}
              />
            </FormField>
            <FormField
              label={PROFILE_FIELD_LABELS.profileName}
              htmlFor="itemName"
              required
              error={resolveFieldError(isSubmitted, errors.itemName)}
            >
              <Input
                id="itemName"
                placeholder="e.g. SLD 3T FRAME 165MM X 32MM"
                aria-invalid={fieldInvalid(isSubmitted, errors.itemName)}
                {...register("itemName")}
              />
            </FormField>
            <ProfileImageUploadField value={designPreview} onChange={setDesignPreview} />
          </FormSection>

          <FormSection title="Dimensions & pricing">
            <ProfileLengthsEditor
              value={lengthsInMeter ?? [0]}
              onChange={(lengths) =>
                setValue("lengthsInMeter", lengths, { shouldValidate: isSubmitted })
              }
              error={getProfileLengthsFieldError(errors, isSubmitted)}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label={PROFILE_FIELD_LABELS.rate}
                htmlFor="rate"
                required
                error={resolveFieldError(isSubmitted, errors.rate)}
              >
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  aria-invalid={fieldInvalid(isSubmitted, errors.rate)}
                  {...register("rate")}
                />
              </FormField>
              <FormField
                label={PROFILE_FIELD_LABELS.powderCoatingRmm}
                htmlFor="powderCoatingRmm"
                required
                error={resolveFieldError(isSubmitted, errors.powderCoatingRmm)}
              >
                <Input
                  id="powderCoatingRmm"
                  type="number"
                  step="0.01"
                  min="0"
                  className="tabular-nums"
                  aria-invalid={fieldInvalid(isSubmitted, errors.powderCoatingRmm)}
                  {...register("powderCoatingRmm")}
                />
              </FormField>
            </div>
            <FormField
              label={PROFILE_FIELD_LABELS.ratePerMeter}
              htmlFor="ratePerMeter"
              hint="Calculated from length and rate"
            >
              <Input
                id="ratePerMeter"
                type="number"
                step="0.01"
                value={ratePerMeter || ""}
                disabled
                readOnly
                className="bg-muted tabular-nums"
              />
            </FormField>
          </FormSection>

          <FormDialogActions
            onCancel={closeDialog}
            submitLabel="Save Profile"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
            disabled={seriesOptions.length === 0}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
