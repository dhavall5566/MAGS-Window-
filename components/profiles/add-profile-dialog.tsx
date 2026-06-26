"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { ProfileImageUploadField } from "@/components/profiles/profile-image-upload-field";
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
  PROFILE_FIELD_LABELS,
  type ProfileFormData,
} from "@/lib/profile-form";
import { buildProfileFromForm } from "@/lib/profile";
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
      dyeCode: "",
      itemName: "",
      powderCoatingRmm: 0,
      kgPerMeter: 0,
    },
  });

  const selectedSeriesName = watch("seriesName");

  const closeDialog = () => {
    setOpen(false);
    reset({
      seriesName: seriesOptions[0] ?? "",
      profileCode: "",
      dyeCode: "",
      itemName: "",
      powderCoatingRmm: 0,
      kgPerMeter: 0,
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
            dyeCode: "",
            itemName: "",
            powderCoatingRmm: 0,
            kgPerMeter: 0,
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
      <DialogContent className="flex max-h-[min(92dvh,calc(100vh-1.5rem))] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <div className="border-b px-6 py-5 pr-14">
          <DialogHeader>
            <DialogTitle>Add New Profile</DialogTitle>
            <DialogDescription>
              Register an aluminium extrusion profile with specifications and optional image.
            </DialogDescription>
          </DialogHeader>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FormSection title="Profile details">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,168px)_minmax(0,1fr)] lg:items-start">
                <ProfileImageUploadField
                  value={designPreview}
                  onChange={setDesignPreview}
                  layout="compact"
                  className="mx-auto w-full max-w-[168px] lg:mx-0"
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <FormField
                    label={PROFILE_FIELD_LABELS.seriesName}
                    htmlFor="seriesName"
                    required
                    className="sm:col-span-2 xl:col-span-2"
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
                    label={PROFILE_FIELD_LABELS.dyeCode}
                    htmlFor="dyeCode"
                    error={resolveFieldError(isSubmitted, errors.dyeCode)}
                  >
                    <Input
                      id="dyeCode"
                      placeholder="e.g. 1001"
                      className="font-mono"
                      aria-invalid={fieldInvalid(isSubmitted, errors.dyeCode)}
                      {...register("dyeCode")}
                    />
                  </FormField>
                  <FormField
                    label={PROFILE_FIELD_LABELS.profileName}
                    htmlFor="itemName"
                    required
                    className="sm:col-span-2 xl:col-span-4"
                    error={resolveFieldError(isSubmitted, errors.itemName)}
                  >
                    <Input
                      id="itemName"
                      placeholder="e.g. SLD 3T FRAME 165MM X 32MM"
                      aria-invalid={fieldInvalid(isSubmitted, errors.itemName)}
                      {...register("itemName")}
                    />
                  </FormField>
                  <FormField
                    label={PROFILE_FIELD_LABELS.powderCoatingRmm}
                    htmlFor="powderCoatingRmm"
                    required
                    className="sm:col-span-1 xl:col-span-2"
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
                  <FormField
                    label={PROFILE_FIELD_LABELS.kgPerMeter}
                    htmlFor="kgPerMeter"
                    required
                    className="sm:col-span-1 xl:col-span-2"
                    error={resolveFieldError(isSubmitted, errors.kgPerMeter)}
                  >
                    <Input
                      id="kgPerMeter"
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
              onCancel={closeDialog}
              submitLabel="Save Profile"
              loadingLabel="Saving"
              isSubmitting={isSubmitting}
              disabled={seriesOptions.length === 0}
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
