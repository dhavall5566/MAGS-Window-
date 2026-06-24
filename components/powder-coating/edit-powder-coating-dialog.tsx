"use client";

import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  powderCoatingFormSchema,
  type PowderCoatingFormData,
} from "@/lib/powder-coating-form";
import { findProfileByCode, getPrimaryProfileLength, getProfileDisplayName, getProfileSelectOptions, weightFromConversionUnit } from "@/lib/profile";
import { getVendorPartyNames, getVendorsForChallanType } from "@/lib/vendor";
import type {
  CoatingColor,
  PowderCoating,
  Profile,
  Vendor,
} from "@/types";

const COATING_COLORS: CoatingColor[] = [
  "White",
  "Black",
  "Matt Black",
  "Dark Bronze",
  "Champagne Gold",
  "Wood Finish",
];

interface EditPowderCoatingDialogProps {
  entry: PowderCoating | null;
  profiles: Profile[];
  vendors: Vendor[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: PowderCoating) => void;
}

export function EditPowderCoatingDialog({
  entry,
  profiles,
  vendors,
  open,
  onOpenChange,
  onSave,
}: EditPowderCoatingDialogProps) {
  const powderCoatingVendors = getVendorsForChallanType(vendors, "powder_coating");
  const vendorOptions = useMemo(() => {
    const names = getVendorPartyNames(powderCoatingVendors);
    if (entry?.vendor && !names.includes(entry.vendor)) {
      return [entry.vendor, ...names];
    }
    return names;
  }, [powderCoatingVendors, entry?.vendor]);

  const profileOptions = useMemo(() => getProfileSelectOptions(profiles), [profiles]);

  const profileSelectOptions = useMemo(() => {
    const options = profileOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
    if (
      entry &&
      !profileOptions.some((option) => option.value === entry.profileCode)
    ) {
      return [
        {
          value: entry.profileCode,
          label: `${entry.profileCode} — ${entry.profileName}`,
        },
        ...options,
      ];
    }
    return options;
  }, [profileOptions, entry]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<PowderCoatingFormData>({
    resolver: zodResolver(powderCoatingFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      batchNo: "",
      date: "",
      profileCode: "",
      quantity: 1,
      weight: 0,
      color: "White",
      vendor: "",
      sentDate: "",
      returnDate: "",
    },
  });

  const profileCode = watch("profileCode");
  const quantity = watch("quantity");

  useEffect(() => {
    if (open && entry) {
      reset({
        batchNo: entry.batchNo,
        date: entry.date,
        profileCode: entry.profileCode,
        quantity: entry.quantity,
        weight: entry.weight,
        color: entry.color,
        vendor: entry.vendor,
        sentDate: entry.sentDate ?? "",
        returnDate: entry.returnDate ?? "",
      });
    }
  }, [open, entry, reset]);

  const onProfileSelect = (code: string) => {
    setValue("profileCode", code, { shouldValidate: true });
    const profile = findProfileByCode(profiles, code);
    if (!profile) return;
    const qty = Number(quantity) || 1;
    const length = getPrimaryProfileLength(profile) || profile.standardLength || 6;
    setValue("weight", weightFromConversionUnit(profile, { length, qty }));
  };

  const onSubmit = (data: PowderCoatingFormData) => {
    if (!entry) return;
    const profile = findProfileByCode(profiles, data.profileCode);
    onSave({
      ...entry,
      batchNo: data.batchNo.trim(),
      date: data.date,
      profileCode: data.profileCode,
      profileName: profile ? getProfileDisplayName(profile) : data.profileCode,
      quantity: data.quantity,
      weight: data.weight,
      color: data.color as CoatingColor,
      vendor: data.vendor,
      sentDate: data.sentDate?.trim() || undefined,
      returnDate: data.returnDate?.trim() || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Powder Coating</DialogTitle>
          <DialogDescription>Update coating batch details, vendor, and dates.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-batchNo">Batch No</Label>
              <Input id="edit-batchNo" {...register("batchNo")} />
              {isSubmitted && errors.batchNo && (
                <p className="text-sm text-destructive">{errors.batchNo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" type="date" {...register("date")} />
              {isSubmitted && errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Profile</Label>
            <SearchableSelect
              value={profileCode || undefined}
              onValueChange={onProfileSelect}
              options={profileSelectOptions}
              placeholder="Select profile"
              searchPlaceholder="Search profile…"
            />
            {isSubmitted && errors.profileCode && (
              <p className="text-sm text-destructive">{errors.profileCode.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="1"
                {...register("quantity", {
                  onChange: (event) => {
                    const profile = findProfileByCode(profiles, profileCode);
                    if (!profile) return;
                    const qty = Number(event.target.value) || 1;
                    const length = getPrimaryProfileLength(profile) || profile.standardLength || 6;
                    setValue("weight", weightFromConversionUnit(profile, { length, qty }));
                  },
                })}
              />
              {isSubmitted && errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-weight">Weight (kg)</Label>
              <Input id="edit-weight" type="number" step="0.01" min="0" {...register("weight")} />
              {isSubmitted && errors.weight && (
                <p className="text-sm text-destructive">{errors.weight.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <SearchableSelect
              value={watch("color")}
              onValueChange={(value) => setValue("color", value, { shouldValidate: true })}
              options={stringSelectOptions(COATING_COLORS)}
              placeholder="Select color"
              searchPlaceholder="Search color…"
            />
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <SearchableSelect
              value={watch("vendor") || undefined}
              onValueChange={(value) => setValue("vendor", value, { shouldValidate: true })}
              options={stringSelectOptions(vendorOptions)}
              placeholder="Select vendor"
              searchPlaceholder="Search vendor…"
            />
            {isSubmitted && errors.vendor && (
              <p className="text-sm text-destructive">{errors.vendor.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-sentDate">Sent Date</Label>
              <Input id="edit-sentDate" type="date" {...register("sentDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-returnDate">Return Date</Label>
              <Input id="edit-returnDate" type="date" {...register("returnDate")} />
            </div>
          </div>

          <FormDialogActions
            onCancel={() => onOpenChange(false)}
            submitLabel="Save Changes"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
