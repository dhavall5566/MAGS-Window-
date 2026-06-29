"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CircleHelp, Plus, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import {
  findProfilesByDyeCode,
  formatStockLength,
  getStockInwardKgPerMeter,
  NOS_FORMULA,
  NOS_LABEL,
  syncStockInwardAfterLengthChange,
  syncStockInwardFromProfiles,
  syncStockInwardFromWeight,
} from "@/lib/stock-inward-calculations";
import {
  createEmptyStockInwardLengthRow,
  createEmptyStockInwardProfileRow,
  calculateStockInwardAddFormTotalWeightKg,
  type StockInwardAddFormData,
} from "@/lib/stock-inward-form";
import { getDefaultStockInwardSupplier, getSupplierPartyNames } from "@/lib/vendor";
import { getProfileCodeValue, getProfileDesignImage } from "@/lib/profile";
import { cn, formatNumber } from "@/lib/utils";
import type { Profile, Vendor } from "@/types";

interface StockInwardFormFieldsProps {
  form: UseFormReturn<StockInwardAddFormData>;
  profiles: Profile[];
  vendors: Vendor[];
  isSubmitted: boolean;
  idPrefix?: string;
}

function TotalProfilesHelp({
  totalWeightKg,
  lengthInMeter,
  kgPerMeter,
  totalProfiles,
}: {
  totalWeightKg: number;
  lengthInMeter: number;
  kgPerMeter: number;
  totalProfiles: number;
}) {
  const content = useMemo(() => {
    if (!totalWeightKg || !lengthInMeter || !kgPerMeter || !totalProfiles) {
      return NOS_FORMULA;
    }

    return (
      <>
        <p>{NOS_FORMULA}</p>
        <p className="mt-1.5 text-muted-foreground">
          {formatStockLength(lengthInMeter)} × {formatNumber(totalProfiles, 2)} ×{" "}
          {formatNumber(kgPerMeter, 3)} = {formatNumber(totalWeightKg, 2)} kg
        </p>
      </>
    );
  }, [kgPerMeter, lengthInMeter, totalProfiles, totalWeightKg]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`How ${NOS_LABEL} is calculated`}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px] text-left">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function LengthRowFields({
  idPrefix,
  index,
  lengthInMeter,
  totalWeightKg,
  totalWeightManualKg,
  totalProfiles,
  kgPerMeter,
  isSubmitted,
  rowErrors,
  showRemove,
  onRemove,
  onLengthChange,
  onWeightChange,
  onManualWeightChange,
  onProfilesChange,
}: {
  idPrefix: string;
  index: number;
  lengthInMeter: number;
  totalWeightKg: number;
  totalWeightManualKg?: number;
  totalProfiles: number;
  kgPerMeter: number;
  isSubmitted: boolean;
  rowErrors?: {
    lengthInMeter?: { message?: string };
    totalWeightKg?: { message?: string };
    totalWeightManualKg?: { message?: string };
    totalProfiles?: { message?: string };
  };
  showRemove: boolean;
  onRemove?: () => void;
  onLengthChange: (value: number) => void;
  onWeightChange: (value: number) => void;
  onManualWeightChange: (value: number | undefined) => void;
  onProfilesChange: (value: number) => void;
}) {
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", showRemove && "bg-muted/20")}>
      {showRemove && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Length {index + 1}</p>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label={`Remove length ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-length-meter-${index}`}>Length (m)</Label>
          <Input
            id={`${idPrefix}-length-meter-${index}`}
            type="number"
            step="any"
            min="0"
            className="tabular-nums"
            placeholder="Enter length"
            value={lengthInMeter || ""}
            onChange={(event) => onLengthChange(Number(event.target.value) || 0)}
          />
          {isSubmitted && rowErrors?.lengthInMeter && (
            <p className="text-sm text-destructive">{rowErrors.lengthInMeter.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex h-5 items-center gap-1.5">
            <Label htmlFor={`${idPrefix}-total-profiles-${index}`}>{NOS_LABEL}</Label>
            <TotalProfilesHelp
              totalWeightKg={totalWeightKg}
              lengthInMeter={lengthInMeter}
              kgPerMeter={kgPerMeter}
              totalProfiles={totalProfiles}
            />
          </div>
          <Input
            id={`${idPrefix}-total-profiles-${index}`}
            type="number"
            step="any"
            min="0"
            className="tabular-nums"
            placeholder={`Enter ${NOS_LABEL}`}
            value={totalProfiles || ""}
            onChange={(event) => onProfilesChange(Number(event.target.value) || 0)}
          />
          {isSubmitted && rowErrors?.totalProfiles && (
            <p className="text-sm text-destructive">{rowErrors.totalProfiles.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-total-weight-${index}`}>Total Weight (kg)</Label>
          <Input
            id={`${idPrefix}-total-weight-${index}`}
            type="number"
            step="any"
            min="0"
            className="tabular-nums"
            placeholder="Auto or enter weight"
            value={totalWeightKg || ""}
            onChange={(event) => onWeightChange(Number(event.target.value) || 0)}
          />
          {isSubmitted && rowErrors?.totalWeightKg && (
            <p className="text-sm text-destructive">{rowErrors.totalWeightKg.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-total-weight-manual-${index}`}>
            Total Weight Manual (Kg)
          </Label>
          <Input
            id={`${idPrefix}-total-weight-manual-${index}`}
            type="number"
            step="any"
            min="0"
            className="tabular-nums"
            placeholder="Enter manual weight"
            value={totalWeightManualKg ?? ""}
            onChange={(event) => {
              const raw = event.target.value.trim();
              onManualWeightChange(raw ? Number(raw) || undefined : undefined);
            }}
          />
          {isSubmitted && rowErrors?.totalWeightManualKg && (
            <p className="text-sm text-destructive">{rowErrors.totalWeightManualKg.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-kg-per-meter-${index}`}>KG/MTR</Label>
          <Input
            id={`${idPrefix}-kg-per-meter-${index}`}
            readOnly
            className="bg-muted tabular-nums"
            value={kgPerMeter ? formatNumber(kgPerMeter, 3) : ""}
            placeholder="From profile"
          />
        </div>
      </div>
    </div>
  );
}

function ProfileLengthRows({
  form,
  profileIndex,
  kgPerMeter,
  isSubmitted,
  idPrefix,
}: {
  form: UseFormReturn<StockInwardAddFormData>;
  profileIndex: number;
  kgPerMeter: number;
  isSubmitted: boolean;
  idPrefix: string;
}) {
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove } = useFieldArray({
    control,
    name: `profileRows.${profileIndex}.lengthRows`,
  });

  const lengthRows = watch(`profileRows.${profileIndex}.lengthRows`);
  const profileErrors = errors.profileRows?.[profileIndex];

  const syncRow = (
    index: number,
    partial: Partial<{ lengthInMeter: number; totalWeightKg: number; totalProfiles: number }>
  ) => {
    const row = form.getValues(`profileRows.${profileIndex}.lengthRows.${index}`);
    const lengthInMeter = partial.lengthInMeter ?? (Number(row?.lengthInMeter) || 0);
    const totalWeightKg = partial.totalWeightKg ?? (Number(row?.totalWeightKg) || 0);
    const totalProfiles = partial.totalProfiles ?? (Number(row?.totalProfiles) || 0);
    const synced = syncStockInwardAfterLengthChange(
      lengthInMeter,
      totalWeightKg,
      totalProfiles,
      kgPerMeter
    );

    const basePath = `profileRows.${profileIndex}.lengthRows.${index}` as const;
    setValue(`${basePath}.lengthInMeter`, lengthInMeter, { shouldValidate: isSubmitted });
    setValue(`${basePath}.totalWeightKg`, synced.totalWeightKg, {
      shouldValidate: isSubmitted,
      shouldDirty: true,
    });
    setValue(`${basePath}.totalProfiles`, synced.totalProfiles, {
      shouldValidate: isSubmitted,
      shouldDirty: true,
    });
    setValue(`${basePath}.kgPerMeter`, kgPerMeter, { shouldValidate: false, shouldDirty: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1">
          <Label>Lengths</Label>
          <p className="text-xs text-muted-foreground">
            Add multiple lengths for the same profile — each length saves as a separate stock inward entry.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append(createEmptyStockInwardLengthRow(kgPerMeter))
          }
        >
          <Plus className="h-4 w-4" />
          Add Length
        </Button>
      </div>

      <div className="space-y-3">
        {fields.map((field, index) => {
          const rowLength = Number(lengthRows?.[index]?.lengthInMeter) || 0;
          const rowWeight = Number(lengthRows?.[index]?.totalWeightKg) || 0;
          const rowManualWeight = lengthRows?.[index]?.totalWeightManualKg;
          const rowProfiles = Number(lengthRows?.[index]?.totalProfiles) || 0;
          const rowErrors = profileErrors?.lengthRows?.[index];
          const basePath = `profileRows.${profileIndex}.lengthRows.${index}` as const;

          return (
            <LengthRowFields
              key={field.id}
              idPrefix={`${idPrefix}-p${profileIndex}`}
              index={index}
              lengthInMeter={rowLength}
              totalWeightKg={rowWeight}
              totalWeightManualKg={rowManualWeight}
              totalProfiles={rowProfiles}
              kgPerMeter={kgPerMeter}
              isSubmitted={isSubmitted}
              rowErrors={rowErrors}
              showRemove={fields.length > 1}
              onRemove={() => remove(index)}
              onLengthChange={(value) => syncRow(index, { lengthInMeter: value })}
              onWeightChange={(value) => {
                const synced = syncStockInwardFromWeight(value, rowLength, kgPerMeter);
                setValue(`${basePath}.totalWeightKg`, synced.totalWeightKg, {
                  shouldValidate: isSubmitted,
                  shouldDirty: true,
                });
                setValue(`${basePath}.totalProfiles`, synced.totalProfiles, {
                  shouldValidate: false,
                  shouldDirty: true,
                });
              }}
              onManualWeightChange={(value) => {
                setValue(`${basePath}.totalWeightManualKg`, value, {
                  shouldValidate: isSubmitted,
                  shouldDirty: true,
                });
              }}
              onProfilesChange={(value) => {
                const synced = syncStockInwardFromProfiles(value, rowLength, kgPerMeter);
                setValue(`${basePath}.totalProfiles`, synced.totalProfiles, {
                  shouldValidate: isSubmitted,
                  shouldDirty: true,
                });
                setValue(`${basePath}.totalWeightKg`, synced.totalWeightKg, {
                  shouldValidate: false,
                  shouldDirty: true,
                });
              }}
            />
          );
        })}
      </div>

      {isSubmitted && profileErrors?.lengthRows?.message && (
        <p className="text-sm text-destructive">{profileErrors.lengthRows.message}</p>
      )}
    </div>
  );
}

function StockInwardProfileRowSection({
  form,
  profiles,
  profileIndex,
  isSubmitted,
  idPrefix,
  showRemove,
  onRemove,
}: {
  form: UseFormReturn<StockInwardAddFormData>;
  profiles: Profile[];
  profileIndex: number;
  isSubmitted: boolean;
  idPrefix: string;
  showRemove: boolean;
  onRemove: () => void;
}) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const dyeCode = watch(`profileRows.${profileIndex}.dyeCode`);
  const profileCode = watch(`profileRows.${profileIndex}.profileCode`);
  const kgPerMeter = Number(watch(`profileRows.${profileIndex}.kgPerMeter`)) || 0;
  const profileErrors = errors.profileRows?.[profileIndex];

  const dyeMatches = useMemo(
    () => findProfilesByDyeCode(profiles, dyeCode ?? ""),
    [profiles, dyeCode]
  );

  const selectedProfile = useMemo(
    () => profiles.find((profile) => getProfileCodeValue(profile) === profileCode),
    [profiles, profileCode]
  );

  const profileImageSrc = selectedProfile ? getProfileDesignImage(selectedProfile) : "";

  useEffect(() => {
    const trimmed = dyeCode?.trim() ?? "";
    const basePath = `profileRows.${profileIndex}` as const;

    if (!trimmed) {
      setValue(`${basePath}.profileCode`, "", { shouldValidate: false });
      setValue(`${basePath}.profileImage`, "", { shouldValidate: false });
      setValue(`${basePath}.kgPerMeter`, 0, { shouldValidate: false });
      return;
    }

    if (dyeMatches.length === 1) {
      const profile = dyeMatches[0];
      setValue(`${basePath}.profileCode`, getProfileCodeValue(profile), {
        shouldValidate: isSubmitted,
      });
      setValue(`${basePath}.profileImage`, getProfileDesignImage(profile), {
        shouldValidate: false,
      });
      setValue(`${basePath}.kgPerMeter`, getStockInwardKgPerMeter(profile), {
        shouldValidate: false,
      });
      return;
    }

    setValue(`${basePath}.profileCode`, "", { shouldValidate: false });
    setValue(`${basePath}.profileImage`, "", { shouldValidate: false });
    setValue(`${basePath}.kgPerMeter`, 0, { shouldValidate: false });
  }, [dyeCode, dyeMatches, profileIndex, setValue, isSubmitted]);

  return (
    <div className="space-y-4 rounded-lg border bg-muted/10 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Die Code {profileIndex + 1}</p>
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-dye-code-${profileIndex}`}>Die Code</Label>
          <Input
            id={`${idPrefix}-dye-code-${profileIndex}`}
            placeholder="e.g. 1001"
            {...register(`profileRows.${profileIndex}.dyeCode`)}
          />
          {isSubmitted && profileErrors?.dyeCode && (
            <p className="text-sm text-destructive">{profileErrors.dyeCode.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-profile-code-${profileIndex}`}>Profile Code</Label>
          <Input
            id={`${idPrefix}-profile-code-${profileIndex}`}
            readOnly
            className="bg-muted font-mono text-sm"
            value={profileCode || ""}
            placeholder="Auto from die code"
          />
          {isSubmitted && profileErrors?.profileCode && (
            <p className="text-sm text-destructive">{profileErrors.profileCode.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Profile Image</Label>
        <div className="flex min-h-[88px] items-center justify-center rounded-lg border bg-muted/20 p-3">
          {profileImageSrc ? (
            <Image
              src={profileImageSrc}
              alt={selectedProfile?.name ?? "Profile drawing"}
              width={160}
              height={96}
              className="max-h-24 w-auto rounded object-contain"
              unoptimized
            />
          ) : (
            <span className="text-sm text-muted-foreground">Auto from die code</span>
          )}
        </div>
      </div>

      <ProfileLengthRows
        form={form}
        profileIndex={profileIndex}
        kgPerMeter={kgPerMeter}
        isSubmitted={isSubmitted}
        idPrefix={idPrefix}
      />
    </div>
  );
}

function useCombinedProfilesTotalWeight(form: UseFormReturn<StockInwardAddFormData>): number {
  const watchedProfileRows = useWatch({
    control: form.control,
    name: "profileRows",
  });

  const [totalWeightKg, setTotalWeightKg] = useState(() =>
    calculateStockInwardAddFormTotalWeightKg(form.getValues("profileRows") ?? [])
  );

  useEffect(() => {
    setTotalWeightKg(
      calculateStockInwardAddFormTotalWeightKg(watchedProfileRows ?? [])
    );
  }, [watchedProfileRows]);

  useEffect(() => {
    const subscription = form.watch((_value, { name, type }) => {
      if (type !== "change" || !name?.startsWith("profileRows")) return;
      setTotalWeightKg(
        calculateStockInwardAddFormTotalWeightKg(form.getValues("profileRows") ?? [])
      );
    });

    return () => subscription.unsubscribe();
  }, [form]);

  return totalWeightKg;
}

function CombinedProfilesTotalWeight({
  form,
  idPrefix,
}: {
  form: UseFormReturn<StockInwardAddFormData>;
  idPrefix: string;
}) {
  const totalWeightKg = useCombinedProfilesTotalWeight(form);

  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
      <Label htmlFor={`${idPrefix}-combined-total-weight`}>Total Weight (All Profiles)</Label>
      <Input
        id={`${idPrefix}-combined-total-weight`}
        readOnly
        className="bg-muted text-base font-semibold tabular-nums"
        value={totalWeightKg > 0 ? `${formatNumber(totalWeightKg, 2)} kg` : ""}
      />
      <p className="text-xs text-muted-foreground">
        Combined total of every length entry across all die codes.
      </p>
    </div>
  );
}

function StockInwardAddProfileRows({
  form,
  profiles,
  isSubmitted,
  idPrefix,
}: {
  form: UseFormReturn<StockInwardAddFormData>;
  profiles: Profile[];
  isSubmitted: boolean;
  idPrefix: string;
}) {
  const { control, formState: { errors } } = form;
  const { fields, append, remove } = useFieldArray({
    control,
    name: "profileRows",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Profiles</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(createEmptyStockInwardProfileRow())}
        >
          <Plus className="h-4 w-4" />
          Add Die Code
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <StockInwardProfileRowSection
            key={field.id}
            form={form}
            profiles={profiles}
            profileIndex={index}
            isSubmitted={isSubmitted}
            idPrefix={idPrefix}
            showRemove={fields.length > 1}
            onRemove={() => remove(index)}
          />
        ))}
      </div>

      {isSubmitted && errors.profileRows?.message && (
        <p className="text-sm text-destructive">{errors.profileRows.message}</p>
      )}

      <CombinedProfilesTotalWeight form={form} idPrefix={idPrefix} />
    </div>
  );
}

export function StockInwardFormFields({
  form,
  profiles,
  vendors,
  isSubmitted,
  idPrefix = "stock",
}: StockInwardFormFieldsProps) {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const selectedSupplier = watch("supplier");

  const supplierOptions = useMemo(() => {
    const names = getSupplierPartyNames(vendors);
    const selected = selectedSupplier?.trim();
    if (
      selected &&
      !names.some((name) => name.toLowerCase() === selected.toLowerCase())
    ) {
      return [selected, ...names].sort((a, b) => a.localeCompare(b));
    }
    return names;
  }, [vendors, selectedSupplier]);

  useEffect(() => {
    const defaultSupplier = getDefaultStockInwardSupplier(vendors);
    if (defaultSupplier && !selectedSupplier?.trim()) {
      setValue("supplier", defaultSupplier, { shouldValidate: isSubmitted });
    }
  }, [vendors, selectedSupplier, setValue, isSubmitted]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-date`}>Date</Label>
        <Input id={`${idPrefix}-date`} type="date" {...register("date")} />
        {isSubmitted && errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-invoice-no`}>Invoice No.</Label>
        <Input
          id={`${idPrefix}-invoice-no`}
          placeholder="Enter invoice number"
          {...register("invoiceNo")}
        />
      </div>

      <div className="space-y-2">
        <Label>Supplier</Label>
        <SearchableSelect
          value={selectedSupplier || ""}
          onValueChange={(value) =>
            setValue("supplier", value, { shouldValidate: isSubmitted })
          }
          options={stringSelectOptions(supplierOptions)}
          placeholder={
            supplierOptions.length === 0
              ? "Add suppliers under Vendors → Suppliers"
              : "Select supplier"
          }
          searchPlaceholder="Search supplier…"
          disabled={supplierOptions.length === 0}
        />
        {supplierOptions.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Add supplier options under Vendors with type &quot;Suppliers&quot;.
          </p>
        )}
        {isSubmitted && errors.supplier && (
          <p className="text-sm text-destructive">{errors.supplier.message}</p>
        )}
      </div>

      <StockInwardAddProfileRows
        form={form}
        profiles={profiles}
        isSubmitted={isSubmitted}
        idPrefix={idPrefix}
      />
    </TooltipProvider>
  );
}
