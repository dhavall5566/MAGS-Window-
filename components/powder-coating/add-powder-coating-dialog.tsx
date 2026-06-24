"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import {
  powderCoatingFormSchema,
  type PowderCoatingFormData,
} from "@/lib/powder-coating-form";
import { findProfileByCode, getPrimaryProfileLength, getProfileDisplayName, getProfileSelectOptions, weightFromConversionUnit } from "@/lib/profile";
import { getVendorPartyNames, getVendorsForChallanType } from "@/lib/vendor";
import { generateId } from "@/lib/utils";
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

function defaultBatchNo() {
  return `PC-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

interface AddPowderCoatingDialogProps {
  profiles: Profile[];
  vendors: Vendor[];
  onSave: (entry: PowderCoating) => void;
}

export function AddPowderCoatingDialog({
  profiles,
  vendors,
  onSave,
}: AddPowderCoatingDialogProps) {
  const [open, setOpen] = useState(false);
  const powderCoatingVendors = getVendorsForChallanType(vendors, "powder_coating");
  const vendorOptions = getVendorPartyNames(powderCoatingVendors);

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
      batchNo: defaultBatchNo(),
      date: new Date().toISOString().split("T")[0],
      profileCode: "",
      quantity: 1,
      weight: 0,
      color: "White",
      vendor: "",
      sentDate: "",
      returnDate: "",
    },
  });

  const profileOptions = getProfileSelectOptions(profiles);
  const profileCode = watch("profileCode");
  const quantity = watch("quantity");

  const resetForm = () => {
    reset({
      batchNo: defaultBatchNo(),
      date: new Date().toISOString().split("T")[0],
      profileCode: "",
      quantity: 1,
      weight: 0,
      color: "White",
      vendor: "",
      sentDate: "",
      returnDate: "",
    });
  };

  const onProfileSelect = (code: string) => {
    const profile = findProfileByCode(profiles, code);
    if (!profile) return;
    setValue("profileCode", code, { shouldValidate: true });
    const qty = Number(quantity) || 1;
    const length = getPrimaryProfileLength(profile) || profile.standardLength || 6;
    setValue(
      "weight",
      weightFromConversionUnit(profile, { length, qty })
    );
  };

  const onSubmit = (data: PowderCoatingFormData) => {
    const profile = findProfileByCode(profiles, data.profileCode);
    const entry: PowderCoating = {
      id: generateId("pc"),
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
    };

    onSave(entry);
    resetForm();
    setOpen(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Powder Coating
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Powder Coating</DialogTitle>
          <DialogDescription>
            Record a powder coating batch sent to a vendor with color and weight details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="batchNo">Batch No</Label>
              <Input id="batchNo" {...register("batchNo")} />
              {isSubmitted && errors.batchNo && (
                <p className="text-sm text-destructive">{errors.batchNo.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" {...register("date")} />
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
              options={profileOptions.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              placeholder="Select profile"
              searchPlaceholder="Search profile…"
            />
            {isSubmitted && errors.profileCode && (
              <p className="text-sm text-destructive">{errors.profileCode.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register("quantity", {
                  onChange: (event) => {
                    const profile = findProfileByCode(profiles, profileCode);
                    if (!profile) return;
                    const qty = Number(event.target.value) || 1;
                    const length = getPrimaryProfileLength(profile) || profile.standardLength || 6;
                    setValue(
                      "weight",
                      weightFromConversionUnit(profile, { length, qty })
                    );
                  },
                })}
              />
              {isSubmitted && errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" step="0.01" min="0" {...register("weight")} />
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
              <Label htmlFor="sentDate">Sent Date</Label>
              <Input id="sentDate" type="date" {...register("sentDate")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="returnDate">Return Date</Label>
              <Input id="returnDate" type="date" {...register("returnDate")} />
            </div>
          </div>

          <FormDialogActions
            onCancel={() => {
              setOpen(false);
              reset();
            }}
            submitLabel="Save Powder Coating"
            loadingLabel="Saving"
            isSubmitting={isSubmitting}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
