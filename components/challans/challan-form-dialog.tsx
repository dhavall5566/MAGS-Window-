"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import { ProfileLengthSelect } from "@/components/shared/profile-length-select";
import {
  findProfileByCode,
  formatCurrency,
  getChallanRatePerMeter,
  getPrimaryProfileLength,
  getProfileDesignImage,
  getProfileDisplayName,
  getProfileLengthOptions,
  getProfileSelectOptions,
  getProfilesForPowderCoatingChallan,
  isLikelyWeightNotLength,
  weightFromConversionUnit,
} from "@/lib/profile";
import {
  applyOutwardChallanToCoatingForm,
  findOutwardChallanById,
  formatOutwardChallanLabel,
  getOutwardChallans,
} from "@/lib/challan-outward";
import { getCoatingColorsForVendor } from "@/lib/powder-coating-vendor-colors";
import { cn, generateId } from "@/lib/utils";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { useAppStore } from "@/lib/store";
import {
  findVendorByPartyName,
  getVendorChallanDetails,
  getVendorPartyNames,
  getVendorsForChallanType,
} from "@/lib/vendor";
import type { Challan, CoatingColor, Profile, Vendor } from "@/types";

const itemSchema = z.object({
  profileCode: z.string().min(1),
  profileName: z.string(),
  profileImage: z.string(),
  length: z.coerce.number().positive("Length must be greater than 0"),
  qty: z.coerce.number().min(1),
  weight: z.coerce.number().min(0),
  rate: z.coerce.number().min(0).optional(),
});

const baseSchema = z.object({
  challanNumber: z.string().min(1),
  date: z.string().min(1),
  vendorName: z.string().min(1, "Vendor is required"),
  vendorAddress: z.string().optional(),
  vendorPersonName: z.string().optional(),
  vendorContact: z.string().optional(),
  vendorGstNo: z.string().optional(),
  vehicleNumber: z.string().min(1),
  driverName: z.string().min(1),
  remarks: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const coatingSchema = baseSchema
  .extend({
    color: z.string().min(1, "Color is required"),
    sourceOutwardChallanId: z.string().optional(),
    sourceOutwardChallanNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const allowed = getCoatingColorsForVendor(data.vendorName);
    if (!allowed.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Selected vendor has no coating colors configured",
        path: ["color"],
      });
      return;
    }
    if (!allowed.includes(data.color as CoatingColor)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a color offered by this vendor",
        path: ["color"],
      });
    }
  });

type BaseForm = z.infer<typeof baseSchema>;
type CoatingForm = z.infer<typeof coatingSchema>;

interface ChallanFormDialogProps {
  type: "outward" | "powder_coating" | "return";
  profiles: Profile[];
  vendors: Vendor[];
  onSave: (challan: Challan) => void;
  challanToEdit?: Challan | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

function defaultChallanNumber(type: ChallanFormDialogProps["type"]) {
  const prefix = type === "outward" ? "OC" : type === "return" ? "RET" : "PC";
  return `${prefix}-2026-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

function defaultItem(
  type: ChallanFormDialogProps["type"],
  length = DEFAULT_APP_SETTINGS.defaultChallanLength
) {
  return {
    profileCode: "",
    profileName: "",
    profileImage: "",
    length,
    qty: 1,
    weight: 0,
    ...(type === "powder_coating" ? { rate: 0 } : {}),
  };
}

function mapItemsForForm(
  items: Challan["items"],
  formType: ChallanFormDialogProps["type"],
  profiles: Profile[]
) {
  return (items ?? []).map((item) => {
    if (formType !== "powder_coating") return item;
    const profile = findProfileByCode(profiles, item.profileCode);
    if (!profile) return item;

    const lengthOptions = getProfileLengthOptions(profile);
    const savedLength = Number(item.length) || 0;
    const length =
      lengthOptions.includes(savedLength) &&
      !isLikelyWeightNotLength(savedLength, profile)
        ? savedLength
        : getPrimaryProfileLength(profile);

    return {
      ...item,
      length,
      rate: getChallanRatePerMeter(profile, length),
    };
  });
}

export function ChallanFormDialog({
  type,
  profiles,
  vendors,
  onSave,
  challanToEdit = null,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: ChallanFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isEdit = Boolean(challanToEdit);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const defaultChallanLength = useAppStore((s) => s.settings.defaultChallanLength);
  const powderCoatingEntries = useAppStore((s) => s.powderCoating);
  const allChallans = useAppStore((s) => s.challans);

  const isPowderCoating = type === "powder_coating";
  const schema = isPowderCoating ? coatingSchema : baseSchema;
  const form = useForm<BaseForm | CoatingForm>({
    resolver: zodResolver(schema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      challanNumber: defaultChallanNumber(type),
      date: new Date().toISOString().split("T")[0],
      vendorName: "",
      vendorAddress: "",
      vendorPersonName: "",
      vendorContact: "",
      vendorGstNo: "",
      vehicleNumber: "",
      driverName: "",
      remarks: "",
      items: [defaultItem(type, defaultChallanLength)],
      ...(isPowderCoating
        ? {
            color: "",
            sourceOutwardChallanId: "",
            sourceOutwardChallanNumber: "",
          }
        : {}),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const coatingValues = isPowderCoating ? (form.watch() as CoatingForm) : null;
  const vendorName = form.watch("vendorName");
  const watchedItems = form.watch("items");

  const outwardChallans = useMemo(
    () => getOutwardChallans(allChallans ?? []),
    [allChallans]
  );

  const vendorColorOptions = useMemo(
    () => getCoatingColorsForVendor(vendorName ?? ""),
    [vendorName]
  );

  const challanVendors = useMemo(
    () => getVendorsForChallanType(vendors, type),
    [vendors, type]
  );

  const vendorOptions = useMemo(() => {
    const names = getVendorPartyNames(challanVendors);
    if (vendorName && !names.includes(vendorName)) {
      return [vendorName, ...names];
    }
    return names;
  }, [challanVendors, vendorName]);

  const itemProfileCodes = useMemo(() => {
    const codes = new Set<string>();
    for (const item of challanToEdit?.items ?? []) {
      const code = item.profileCode?.trim();
      if (code) codes.add(code);
    }
    for (const item of watchedItems ?? []) {
      const code = item.profileCode?.trim();
      if (code) codes.add(code);
    }
    return [...codes];
  }, [challanToEdit, watchedItems]);

  const selectableProfiles = useMemo(() => {
    if (!isPowderCoating) return profiles;
    return getProfilesForPowderCoatingChallan(
      profiles,
      powderCoatingEntries ?? [],
      itemProfileCodes
    );
  }, [isPowderCoating, profiles, powderCoatingEntries, itemProfileCodes]);

  const profileOptions = useMemo(
    () => getProfileSelectOptions(selectableProfiles),
    [selectableProfiles]
  );

  const onVendorSelect = (partyName: string) => {
    const vendor = findVendorByPartyName(challanVendors, partyName);
    if (!vendor) {
      form.setValue("vendorName", partyName, { shouldValidate: true });
      form.setValue("vendorAddress", "");
      form.setValue("vendorPersonName", "");
      form.setValue("vendorContact", "");
      form.setValue("vendorGstNo", "");
      form.setValue("color" as "color", "", { shouldValidate: true });
      return;
    }

    const details = getVendorChallanDetails(vendor);
    form.setValue("vendorName", details.vendorName, { shouldValidate: true });
    form.setValue("vendorAddress", details.vendorAddress);
    form.setValue("vendorPersonName", details.vendorPersonName);
    form.setValue("vendorContact", details.vendorContact);
    form.setValue("vendorGstNo", details.vendorGstNo);

    const colors = getCoatingColorsForVendor(details.vendorName);
    const currentColor = form.getValues("color" as "color");
    if (!colors.includes(currentColor as CoatingColor)) {
      form.setValue("color" as "color", colors[0] ?? "", { shouldValidate: true });
    }
  };

  const onOutwardChallanSelect = (outwardId: string) => {
    if (!outwardId || outwardId === "__none__") {
      form.setValue("sourceOutwardChallanId", "");
      form.setValue("sourceOutwardChallanNumber", "");
      return;
    }

    const outward = findOutwardChallanById(allChallans ?? [], outwardId);
    if (!outward) return;

    const applied = applyOutwardChallanToCoatingForm(outward, profiles);
    form.setValue("sourceOutwardChallanId", applied.sourceOutwardChallanId);
    form.setValue("sourceOutwardChallanNumber", applied.sourceOutwardChallanNumber);
    form.setValue("vehicleNumber", applied.vehicleNumber);
    form.setValue("driverName", applied.driverName);

    if (applied.items.length > 0) {
      replace(applied.items);
    }
  };

  const updateItemWeight = (index: number) => {
    const profileCode = form.getValues(`items.${index}.profileCode`);
    const profile = findProfileByCode(profiles, profileCode);
    if (!profile) {
      form.setValue(`items.${index}.weight`, 0);
      return;
    }
    const length = Number(form.getValues(`items.${index}.length`)) || 0;
    const qty = Number(form.getValues(`items.${index}.qty`)) || 1;
    form.setValue(
      `items.${index}.weight`,
      weightFromConversionUnit(profile, { length, qty })
    );
    if (isPowderCoating && length > 0) {
      form.setValue(
        `items.${index}.rate`,
        getChallanRatePerMeter(profile, length),
        { shouldValidate: true }
      );
    }
  };

  useEffect(() => {
    if (!open) return;
    if (challanToEdit) {
      form.reset({
        challanNumber: challanToEdit.challanNumber,
        date: challanToEdit.date,
        vendorName: challanToEdit.vendorName,
        vendorAddress: challanToEdit.vendorAddress ?? "",
        vendorPersonName: challanToEdit.vendorPersonName ?? "",
        vendorContact: challanToEdit.vendorContact ?? "",
        vendorGstNo: challanToEdit.vendorGstNo ?? "",
        vehicleNumber: challanToEdit.vehicleNumber,
        driverName: challanToEdit.driverName,
        remarks: challanToEdit.remarks ?? "",
        items: mapItemsForForm(challanToEdit.items ?? [], type, profiles),
        ...(challanToEdit.type === "powder_coating"
          ? {
              color: challanToEdit.color,
              sourceOutwardChallanId: challanToEdit.sourceOutwardChallanId ?? "",
              sourceOutwardChallanNumber: challanToEdit.sourceOutwardChallanNumber ?? "",
            }
          : {}),
      } as BaseForm | CoatingForm);
      replace(mapItemsForForm(challanToEdit.items ?? [], type, profiles));
      if (!challanToEdit.vendorAddress && challanToEdit.vendorName) {
        const vendor = findVendorByPartyName(vendors, challanToEdit.vendorName);
        if (vendor) {
          const details = getVendorChallanDetails(vendor);
          form.setValue("vendorAddress", details.vendorAddress);
          form.setValue("vendorPersonName", details.vendorPersonName);
          form.setValue("vendorContact", details.vendorContact);
          form.setValue("vendorGstNo", details.vendorGstNo);
        }
      }
    } else {
      form.reset({
        challanNumber: defaultChallanNumber(type),
        date: new Date().toISOString().split("T")[0],
        vendorName: "",
        vendorAddress: "",
        vendorPersonName: "",
        vendorContact: "",
        vendorGstNo: "",
        vehicleNumber: "",
        driverName: "",
        remarks: "",
        items: [defaultItem(type, defaultChallanLength)],
        ...(isPowderCoating
          ? {
              color: "",
              sourceOutwardChallanId: "",
              sourceOutwardChallanNumber: "",
            }
          : {}),
      } as BaseForm | CoatingForm);
    }
  }, [open, challanToEdit, type, form, replace, vendors, profiles, defaultChallanLength, isPowderCoating]);

  useEffect(() => {
    if (!open || !isPowderCoating || profiles.length === 0) return;

    const items = form.getValues("items") ?? [];
    let changed = false;
    const nextItems = items.map((item) => {
      const profile = findProfileByCode(profiles, item.profileCode);
      if (!profile) return item;

      const lengthOptions = getProfileLengthOptions(profile);
      const savedLength = Number(item.length) || 0;
      const length =
        lengthOptions.includes(savedLength) &&
        !isLikelyWeightNotLength(savedLength, profile)
          ? savedLength
          : getPrimaryProfileLength(profile);
      const rate = getChallanRatePerMeter(profile, length);

      if (item.length !== length || item.rate !== rate) {
        changed = true;
      }

      return { ...item, length, rate };
    });

    if (changed) {
      replace(nextItems);
    }
  }, [open, isPowderCoating, profiles, form, replace]);

  const onProfileSelect = (index: number, code: string) => {
    const profile = findProfileByCode(profiles, code);
    if (!profile) return;
    form.setValue(`items.${index}.profileCode`, profile.code);
    form.setValue(`items.${index}.profileName`, getProfileDisplayName(profile));
    form.setValue(`items.${index}.profileImage`, getProfileDesignImage(profile));
    const length =
      getPrimaryProfileLength(profile) ||
      profile.standardLength ||
      defaultChallanLength;
    form.setValue(`items.${index}.length`, length);
    const rate = getChallanRatePerMeter(profile, length);
    if (isPowderCoating) {
      form.setValue(`items.${index}.rate`, rate, { shouldValidate: true });
    }
    updateItemWeight(index);
  };

  const onSubmit = (data: BaseForm | CoatingForm) => {
    const items =
      isPowderCoating
        ? data.items.map((item) => {
            const profile = findProfileByCode(profiles, item.profileCode);
            return {
              ...item,
              rate: profile
                ? getChallanRatePerMeter(profile, Number(item.length) || 0)
                : item.rate ?? 0,
            };
          })
        : data.items.map(({ rate: _rate, ...item }) => item);

    const base = {
      id: challanToEdit?.id ?? generateId("chl"),
      challanNumber: data.challanNumber,
      date: data.date,
      vendorName: data.vendorName,
      vendorAddress: data.vendorAddress,
      vendorPersonName: data.vendorPersonName,
      vendorContact: data.vendorContact,
      vendorGstNo: data.vendorGstNo,
      vehicleNumber: data.vehicleNumber,
      driverName: data.driverName,
      remarks: data.remarks,
      items,
    };

    let challan: Challan;
    if (type === "outward") {
      challan = { ...base, type: "outward" };
    } else if (type === "return") {
      challan = { ...base, type: "return" };
    } else {
      const coatingData = data as CoatingForm;
      challan = {
        ...base,
        type: "powder_coating",
        color: coatingData.color as CoatingColor,
        sourceOutwardChallanId: coatingData.sourceOutwardChallanId?.trim() || undefined,
        sourceOutwardChallanNumber: coatingData.sourceOutwardChallanNumber?.trim() || undefined,
      };
    }

    onSave(challan);
    setOpen(false);
  };

  const title =
    type === "outward"
      ? isEdit
        ? "Edit Outward Challan"
        : "New Outward Challan"
      : type === "return"
        ? isEdit
          ? "Edit Return Challan"
          : "New Return Challan"
        : isEdit
          ? "Edit Powder Coating Challan"
          : "New Powder Coating Challan";

  const dialog = (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description="Complete challan details, vendor information, and line items before saving."
      trigger={
        showTrigger && !isEdit ? (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            {title.replace("New ", "")}
          </Button>
        ) : undefined
      }
      onSubmit={form.handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => setOpen(false)}
          submitLabel={isEdit ? "Save Changes" : "Create Challan"}
          loadingLabel="Saving"
          isSubmitting={form.formState.isSubmitting}
        />
      }
    >
          <FormSection title="Challan details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Challan Number"
              required
              error={resolveFieldError(form.formState.isSubmitted, form.formState.errors.challanNumber)}
            >
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.challanNumber)}
                {...form.register("challanNumber")}
              />
            </FormField>
            <FormField
              label="Date"
              required
              error={resolveFieldError(form.formState.isSubmitted, form.formState.errors.date)}
            >
              <Input
                type="date"
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.date)}
                {...form.register("date")}
              />
            </FormField>
            {isPowderCoating && (
              <div className="space-y-2 col-span-2">
                <Label>Outward Challan</Label>
                <SearchableSelect
                  value={coatingValues?.sourceOutwardChallanId || "__none__"}
                  onValueChange={onOutwardChallanSelect}
                  options={[
                    { value: "__none__", label: "Select outward challan" },
                    ...outwardChallans.map((challan) => ({
                      value: challan.id,
                      label: formatOutwardChallanLabel(challan),
                    })),
                  ]}
                  placeholder="Select outward challan to load items"
                  searchPlaceholder="Search outward challan…"
                />
                <p className="text-xs text-muted-foreground">
                  Loads profile, quantity, length, rate, vehicle number, and driver from the
                  outward challan. Vendor and color are not changed.
                </p>
              </div>
            )}
            <div className="space-y-2 col-span-2">
              <Label>Vendor</Label>
              <SearchableSelect
                value={vendorName || undefined}
                onValueChange={onVendorSelect}
                options={stringSelectOptions(vendorOptions)}
                placeholder="Select vendor"
                searchPlaceholder="Search vendor…"
              />
              {form.formState.isSubmitted && form.formState.errors.vendorName && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.vendorName.message}
                </p>
              )}
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                value={form.watch("vendorName") ?? ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="vendorGstNo">GST No.</Label>
              <Input
                id="vendorGstNo"
                value={form.watch("vendorGstNo") ?? ""}
                disabled
                readOnly
                className="bg-muted font-mono text-sm"
                placeholder="Auto from vendor"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="vendorAddress">Address</Label>
              <Textarea
                id="vendorAddress"
                rows={2}
                value={form.watch("vendorAddress") ?? ""}
                disabled
                readOnly
                className="bg-muted resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorPersonName">Person Name</Label>
              <Input
                id="vendorPersonName"
                value={form.watch("vendorPersonName") ?? ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendorContact">Contact</Label>
              <Input
                id="vendorContact"
                value={form.watch("vendorContact") ?? ""}
                disabled
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label>Vehicle Number</Label>
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.vehicleNumber)}
                {...form.register("vehicleNumber")}
              />
              {form.formState.isSubmitted && form.formState.errors.vehicleNumber && (
                <p className="text-xs text-destructive">{form.formState.errors.vehicleNumber.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Driver Name</Label>
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.driverName)}
                {...form.register("driverName")}
              />
              {form.formState.isSubmitted && form.formState.errors.driverName && (
                <p className="text-xs text-destructive">{form.formState.errors.driverName.message}</p>
              )}
            </div>
            {type === "powder_coating" && (
              <>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <SearchableSelect
                    value={coatingValues?.color || undefined}
                    onValueChange={(v) => form.setValue("color" as "color", v as CoatingColor)}
                    disabled={!vendorName || vendorColorOptions.length === 0}
                    options={stringSelectOptions(vendorColorOptions)}
                    placeholder={vendorName ? "Select color" : "Select vendor first"}
                    searchPlaceholder="Search color…"
                  />
                  {isPowderCoating &&
                    form.formState.isSubmitted &&
                    "color" in form.formState.errors &&
                    form.formState.errors.color && (
                    <p className="text-sm text-destructive">
                      {String(form.formState.errors.color.message ?? form.formState.errors.color)}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          </FormSection>

          <FormField label="Remarks" optional>
            <Textarea {...form.register("remarks")} rows={2} placeholder="Optional notes for this challan" />
          </FormField>

          <FormSection
            title="Line items"
            description="Add profiles, quantities, and lengths included on this challan."
          >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append(defaultItem(type, defaultChallanLength))}
              >
                Add Item
              </Button>
            </div>
            {fields.map((field, index) => {
              const itemProfileCode = form.watch(`items.${index}.profileCode`);
              const itemProfile = findProfileByCode(profiles, itemProfileCode);
              const itemLength = form.watch(`items.${index}.length`);

              return (
              <div
                key={field.id}
                className={cn(
                  "grid grid-cols-1 items-end gap-3 rounded-lg border p-3 sm:grid-cols-2 lg:grid-cols-4",
                  fields.length > 1 && "xl:grid-cols-6",
                  isPowderCoating && fields.length <= 1 && "xl:grid-cols-5"
                )}
              >
                <div className="space-y-1 sm:col-span-2 lg:col-span-2">
                  <Label className="text-xs">Profile</Label>
                  <SearchableSelect
                    value={itemProfileCode}
                    onValueChange={(v) => onProfileSelect(index, v)}
                    options={profileOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    placeholder="Select profile"
                    searchPlaceholder="Search profile…"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    className="min-w-0"
                    {...form.register(`items.${index}.qty`, {
                      onChange: () => updateItemWeight(index),
                    })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Length (m)</Label>
                  <ProfileLengthSelect
                    profile={itemProfile}
                    value={Number(itemLength) || 0}
                    className="min-w-0"
                    onChange={(length) => {
                      form.setValue(`items.${index}.length`, length, {
                        shouldValidate: true,
                      });
                      updateItemWeight(index);
                    }}
                  />
                </div>
                {!isPowderCoating && (
                  <div className="space-y-1">
                    <Label className="text-xs">R MTR Rate</Label>
                    <Input
                      className="min-w-0 bg-muted tabular-nums"
                      readOnly
                      value={
                        itemProfile
                          ? formatCurrency(
                              getChallanRatePerMeter(
                                itemProfile,
                                Number(itemLength) || undefined
                              )
                            )
                          : "—"
                      }
                    />
                  </div>
                )}
                {isPowderCoating && (
                  <div className="space-y-1">
                    <Label className="text-xs">Rate</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      className="min-w-0 bg-muted"
                      readOnly
                      value={
                        itemProfile
                          ? getChallanRatePerMeter(
                              itemProfile,
                              Number(itemLength) || undefined
                            )
                          : ""
                      }
                    />
                  </div>
                )}
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto sm:justify-self-end"
                    onClick={() => remove(index)}
                  >
                    ×
                  </Button>
                )}
              </div>
            );
            })}
          </div>
          {form.formState.isSubmitted && form.formState.errors.items?.message && (
            <p className="text-xs text-destructive">{String(form.formState.errors.items.message)}</p>
          )}
          </FormSection>
    </FormDialog>
  );

  return dialog;
}
