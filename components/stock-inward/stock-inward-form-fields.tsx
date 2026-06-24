"use client";

import { useEffect, useMemo } from "react";
import { CircleHelp, Plus, Trash2 } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
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
import { ProfileLengthSelect } from "@/components/shared/profile-length-select";
import {
  formatProfileLengthLabel,
  getProfileCodeValue,
  getPrimaryProfileLength,
  getProfileLengthOptions,
} from "@/lib/profile";
import {
  buildStockInwardMetrics,
  findProfilesByDyeCode,
  getStockInwardKgPerMeter,
  getStockInwardRate,
  NOS_FORMULA,
  NOS_LABEL,
  syncStockInwardAfterLengthChange,
  syncStockInwardFromProfiles,
  syncStockInwardFromWeight,
} from "@/lib/stock-inward-calculations";
import {
  DEFAULT_STOCK_INWARD_SUPPLIER,
  STOCK_INWARD_SUPPLIERS,
  type StockInwardAddFormData,
  type StockInwardFormData,
  type StockInwardSupplier,
} from "@/lib/stock-inward-form";
import { cn, formatNumber } from "@/lib/utils";
import type { Profile } from "@/types";

interface StockInwardFormFieldsBaseProps {
  profiles: Profile[];
  isSubmitted: boolean;
  idPrefix?: string;
}

interface StockInwardEditFormFieldsProps extends StockInwardFormFieldsBaseProps {
  mode?: "edit";
  form: UseFormReturn<StockInwardFormData>;
}

interface StockInwardAddFormFieldsProps extends StockInwardFormFieldsBaseProps {
  mode: "add";
  form: UseFormReturn<StockInwardAddFormData>;
}

type StockInwardSharedFormData = {
  dyeCode: string;
  profileCode: string;
  supplier: StockInwardSupplier;
  date: string;
  invoiceNo: string;
};

type StockInwardFormFieldsProps =
  | StockInwardEditFormFieldsProps
  | StockInwardAddFormFieldsProps;

function useStockInwardSharedForm(form: UseFormReturn<StockInwardFormData> | UseFormReturn<StockInwardAddFormData>) {
  return form as unknown as UseFormReturn<StockInwardSharedFormData>;
}

function getNextAvailableLength(profile: Profile | undefined, usedLengths: number[]): number {
  if (!profile) return 0;
  const options = getProfileLengthOptions(profile);
  const unused = options.find((length) => !usedLengths.includes(length));
  return unused ?? getPrimaryProfileLength(profile);
}

function TotalProfilesHelp({
  totalWeightKg,
  lengthInMeter,
  selectedProfile,
  totalProfiles,
}: {
  totalWeightKg: number;
  lengthInMeter: number;
  selectedProfile: Profile | undefined;
  totalProfiles: number;
}) {
  const content = useMemo(() => {
    const kgPerMeter = getStockInwardKgPerMeter(selectedProfile);
    if (!totalWeightKg || !lengthInMeter || !kgPerMeter || !totalProfiles) {
      return NOS_FORMULA;
    }

    return (
      <>
        <p>{NOS_FORMULA}</p>
        <p className="mt-1.5 text-muted-foreground">
          {formatNumber(totalWeightKg, 2)} ÷ ({formatNumber(lengthInMeter, 4)} ×{" "}
          {formatNumber(kgPerMeter, 2)}) = {formatNumber(totalProfiles, 2)}
        </p>
      </>
    );
  }, [lengthInMeter, selectedProfile, totalProfiles, totalWeightKg]);

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
      <TooltipContent side="top" className="max-w-[260px] text-left">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function StockInwardAddLengthRows({
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
  const {
    watch,
    setValue,
    control,
    formState: { errors },
  } = form;

  const { fields, append, remove, replace } = useFieldArray({
    control,
    name: "lengthRows",
  });

  const dyeCode = watch("dyeCode");
  const profileCode = watch("profileCode");
  const lengthRows = watch("lengthRows");

  const dyeMatches = useMemo(
    () => findProfilesByDyeCode(profiles, dyeCode ?? ""),
    [profiles, dyeCode]
  );

  const selectedProfile = useMemo(
    () => profiles.find((profile) => getProfileCodeValue(profile) === profileCode),
    [profiles, profileCode]
  );

  const lengthOptions = useMemo(
    () => getProfileLengthOptions(selectedProfile),
    [selectedProfile]
  );

  const canAddLength = Boolean(selectedProfile) && fields.length < lengthOptions.length;

  useEffect(() => {
    if (!selectedProfile) {
      replace([{ lengthInMeter: 0, totalWeightKg: 0, totalProfiles: 0 }]);
      return;
    }

    const options = getProfileLengthOptions(selectedProfile);
    const primary = getPrimaryProfileLength(selectedProfile);
    const currentRows = form.getValues("lengthRows") ?? [];

    if (currentRows.length === 0) {
      replace([{ lengthInMeter: primary, totalWeightKg: 0, totalProfiles: 0 }]);
      return;
    }

    const used = new Set<number>();
    const nextRows = currentRows.map((row) => {
      let lengthInMeter = row.lengthInMeter;
      if (!options.includes(lengthInMeter) || used.has(lengthInMeter)) {
        lengthInMeter = options.find((option) => !used.has(option)) ?? primary;
      }
      used.add(lengthInMeter);
      const synced = syncStockInwardAfterLengthChange(
        lengthInMeter,
        Number(row.totalWeightKg) || 0,
        Number(row.totalProfiles) || 0,
        selectedProfile
      );
      return {
        lengthInMeter,
        totalWeightKg: synced.totalWeightKg,
        totalProfiles: synced.totalProfiles,
      };
    });

    const changed = nextRows.some(
      (row, index) =>
        row.lengthInMeter !== currentRows[index]?.lengthInMeter ||
        row.totalWeightKg !== currentRows[index]?.totalWeightKg ||
        row.totalProfiles !== currentRows[index]?.totalProfiles
    );

    if (changed) {
      replace(nextRows);
    }
  }, [selectedProfile, form, replace]);

  const handleAddLength = () => {
    if (!selectedProfile || !canAddLength) return;

    const usedLengths = (lengthRows ?? []).map((row) => Number(row.lengthInMeter) || 0);
    append({
      lengthInMeter: getNextAvailableLength(selectedProfile, usedLengths),
      totalWeightKg: 0,
      totalProfiles: 0,
    });
  };

  const syncRowAfterLengthChange = (index: number) => {
    if (!selectedProfile) return;

    const row = form.getValues(`lengthRows.${index}`);
    const synced = syncStockInwardAfterLengthChange(
      Number(row?.lengthInMeter) || 0,
      Number(row?.totalWeightKg) || 0,
      Number(row?.totalProfiles) || 0,
      selectedProfile
    );

    setValue(`lengthRows.${index}.totalWeightKg`, synced.totalWeightKg, {
      shouldValidate: false,
    });
    setValue(`lengthRows.${index}.totalProfiles`, synced.totalProfiles, {
      shouldValidate: false,
    });
  };

  const handleWeightChange = (index: number, weight: number) => {
    const length = Number(form.getValues(`lengthRows.${index}.lengthInMeter`)) || 0;
    const synced = syncStockInwardFromWeight(weight, length, selectedProfile);

    setValue(`lengthRows.${index}.totalWeightKg`, synced.totalWeightKg, {
      shouldValidate: isSubmitted,
    });
    setValue(`lengthRows.${index}.totalProfiles`, synced.totalProfiles, {
      shouldValidate: false,
    });
  };

  const handleProfilesChange = (index: number, profiles: number) => {
    const length = Number(form.getValues(`lengthRows.${index}.lengthInMeter`)) || 0;
    const synced = syncStockInwardFromProfiles(profiles, length, selectedProfile);

    setValue(`lengthRows.${index}.totalProfiles`, synced.totalProfiles, {
      shouldValidate: isSubmitted,
    });
    setValue(`lengthRows.${index}.totalWeightKg`, synced.totalWeightKg, {
      shouldValidate: false,
    });
  };

  const handleLengthChange = (index: number, length: number) => {
    setValue(`lengthRows.${index}.lengthInMeter`, length, {
      shouldValidate: isSubmitted,
    });

    if (!selectedProfile) return;

    const rows = form.getValues("lengthRows") ?? [];
    rows.forEach((row, rowIndex) => {
      if (rowIndex === index || Number(row.lengthInMeter) !== length) return;

      const usedLengths = rows.map((entry, usedIndex) => {
        if (usedIndex === rowIndex) return 0;
        if (usedIndex === index) return length;
        return Number(entry.lengthInMeter) || 0;
      });

      setValue(
        `lengthRows.${rowIndex}.lengthInMeter`,
        getNextAvailableLength(selectedProfile, usedLengths),
        { shouldValidate: isSubmitted }
      );
      syncRowAfterLengthChange(rowIndex);
    });

    syncRowAfterLengthChange(index);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Lengths</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canAddLength}
          onClick={handleAddLength}
        >
          <Plus className="h-4 w-4" />
          Add Length
        </Button>
      </div>

      {!selectedProfile && dyeMatches.length > 1 && (
        <p className="text-sm text-muted-foreground">Select a profile via dye code first.</p>
      )}

      <div className="space-y-3">
        {fields.map((field, index) => {
          const rowLength = Number(lengthRows?.[index]?.lengthInMeter) || 0;
          const rowWeight = Number(lengthRows?.[index]?.totalWeightKg) || 0;
          const rowProfiles = Number(lengthRows?.[index]?.totalProfiles) || 0;
          const metrics = buildStockInwardMetrics(selectedProfile, rowWeight, rowLength);
          const rowErrors = errors.lengthRows?.[index];
          const usedByOtherRows = (lengthRows ?? [])
            .map((row, rowIndex) => (rowIndex === index ? 0 : Number(row.lengthInMeter) || 0))
            .filter(Boolean);

          return (
            <div
              key={field.id}
              className={cn(
                "space-y-3 rounded-lg border p-3",
                fields.length > 1 && "bg-muted/20"
              )}
            >
              {fields.length > 1 && (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Length {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={`Remove length ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-length-meter-${index}`}>Length (m)</Label>
                <ProfileLengthSelect
                  profile={selectedProfile}
                  value={rowLength}
                  disabled={!selectedProfile}
                  excludeLengths={usedByOtherRows}
                  onChange={(length) => handleLengthChange(index, length)}
                />
                {isSubmitted && rowErrors?.lengthInMeter && (
                  <p className="text-sm text-destructive">{rowErrors.lengthInMeter.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}-total-weight-${index}`}>Total Weight (kg)</Label>
                <Input
                  id={`${idPrefix}-total-weight-${index}`}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Enter total weight"
                  value={rowWeight || ""}
                  onChange={(event) =>
                    handleWeightChange(index, Number(event.target.value) || 0)
                  }
                />
                {isSubmitted && rowErrors?.totalWeightKg && (
                  <p className="text-sm text-destructive">{rowErrors.totalWeightKg.message}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Length (ft)</Label>
                  <Input
                    readOnly
                    className="bg-muted tabular-nums"
                    value={metrics.lengthFeet ? formatNumber(metrics.lengthFeet, 2) : ""}
                    placeholder="Auto from profile length"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex h-5 items-center gap-1.5">
                    <Label htmlFor={`${idPrefix}-total-profiles-${index}`}>{NOS_LABEL}</Label>
                    <TotalProfilesHelp
                      totalWeightKg={rowWeight}
                      lengthInMeter={rowLength}
                      selectedProfile={selectedProfile}
                      totalProfiles={rowProfiles}
                    />
                  </div>
                  <Input
                    id={`${idPrefix}-total-profiles-${index}`}
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    placeholder={`Enter ${NOS_LABEL}`}
                    value={rowProfiles || ""}
                    onChange={(event) =>
                      handleProfilesChange(index, Number(event.target.value) || 0)
                    }
                  />
                  {isSubmitted && rowErrors?.totalProfiles && (
                    <p className="text-sm text-destructive">{rowErrors.totalProfiles.message}</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {canAddLength && lengthOptions.length > 1 && (
        <p className="text-xs text-muted-foreground">
          Available lengths: {lengthOptions.map(formatProfileLengthLabel).join(", ")}
        </p>
      )}

      {isSubmitted && errors.lengthRows?.message && (
        <p className="text-sm text-destructive">{errors.lengthRows.message}</p>
      )}
    </div>
  );
}

export function StockInwardFormFields(props: StockInwardFormFieldsProps) {
  const { profiles, isSubmitted, idPrefix = "stock", mode = "edit" } = props;
  const editForm =
    mode === "edit" ? (props as StockInwardEditFormFieldsProps).form : null;
  const addForm =
    mode === "add" ? (props as StockInwardAddFormFieldsProps).form : null;
  const sharedForm = useStockInwardSharedForm(props.form);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = sharedForm;

  const dyeCode = watch("dyeCode");
  const profileCode = watch("profileCode");
  const selectedSupplier = watch("supplier");

  const dyeMatches = useMemo(
    () => findProfilesByDyeCode(profiles, dyeCode ?? ""),
    [profiles, dyeCode]
  );

  const selectedProfile = useMemo(
    () => profiles.find((profile) => getProfileCodeValue(profile) === profileCode),
    [profiles, profileCode]
  );

  useEffect(() => {
    const trimmed = dyeCode?.trim() ?? "";
    if (!trimmed) {
      setValue("profileCode", "", { shouldValidate: false });
      return;
    }

    if (dyeMatches.length === 1) {
      setValue("profileCode", getProfileCodeValue(dyeMatches[0]), {
        shouldValidate: isSubmitted,
      });
      return;
    }

    setValue("profileCode", "", { shouldValidate: false });
  }, [dyeCode, dyeMatches, setValue, isSubmitted]);

  const editLengthInMeter =
    editForm ? Number(editForm.watch("lengthInMeter")) || 0 : 0;
  const editTotalWeightKg =
    editForm ? Number(editForm.watch("totalWeightKg")) || 0 : 0;
  const editTotalProfiles =
    editForm ? Number(editForm.watch("totalProfiles")) || 0 : 0;

  const handleEditWeightChange = (weight: number) => {
    if (!editForm) return;
    const synced = syncStockInwardFromWeight(weight, editLengthInMeter, selectedProfile);
    editForm.setValue("totalWeightKg", synced.totalWeightKg, { shouldValidate: isSubmitted });
    editForm.setValue("totalProfiles", synced.totalProfiles, { shouldValidate: false });
  };

  const handleEditProfilesChange = (profiles: number) => {
    if (!editForm) return;
    const synced = syncStockInwardFromProfiles(profiles, editLengthInMeter, selectedProfile);
    editForm.setValue("totalProfiles", synced.totalProfiles, { shouldValidate: isSubmitted });
    editForm.setValue("totalWeightKg", synced.totalWeightKg, { shouldValidate: false });
  };

  const handleEditLengthChange = (length: number) => {
    if (!editForm) return;
    editForm.setValue("lengthInMeter", length, { shouldValidate: isSubmitted });

    const synced = syncStockInwardAfterLengthChange(
      length,
      Number(editForm.getValues("totalWeightKg")) || 0,
      Number(editForm.getValues("totalProfiles")) || 0,
      selectedProfile
    );
    editForm.setValue("totalWeightKg", synced.totalWeightKg, { shouldValidate: false });
    editForm.setValue("totalProfiles", synced.totalProfiles, { shouldValidate: false });
  };

  useEffect(() => {
    if (!editForm) return;

    if (!selectedProfile) {
      editForm.setValue("lengthInMeter", 0, { shouldValidate: false });
      return;
    }

    const options = getProfileLengthOptions(selectedProfile);
    const current = Number(editForm.getValues("lengthInMeter")) || 0;
    if (!options.includes(current)) {
      editForm.setValue("lengthInMeter", getPrimaryProfileLength(selectedProfile), {
        shouldValidate: isSubmitted,
      });
    }
  }, [editForm, selectedProfile, isSubmitted]);

  const editMetrics = useMemo(
    () =>
      mode === "edit"
        ? buildStockInwardMetrics(selectedProfile, editTotalWeightKg, editLengthInMeter)
        : null,
    [mode, selectedProfile, editTotalWeightKg, editLengthInMeter]
  );

  const profileLabel = selectedProfile
    ? `${getProfileCodeValue(selectedProfile)} — ${selectedProfile.name}`
    : "";

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-dye-code`}>Dye Code</Label>
        <Input
          id={`${idPrefix}-dye-code`}
          placeholder="01 → M25-01"
          {...register("dyeCode")}
        />
        {isSubmitted && errors.dyeCode && (
          <p className="text-sm text-destructive">{errors.dyeCode.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Profile</Label>
        <Input
          readOnly
          className="bg-muted font-mono text-sm"
          value={profileLabel}
          placeholder="Auto from dye code"
        />
        {isSubmitted && errors.profileCode && (
          <p className="text-sm text-destructive">{errors.profileCode.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Supplier</Label>
        <SearchableSelect
          value={selectedSupplier || DEFAULT_STOCK_INWARD_SUPPLIER}
          onValueChange={(value) =>
            setValue("supplier", value as StockInwardSupplier, { shouldValidate: isSubmitted })
          }
          options={stringSelectOptions(STOCK_INWARD_SUPPLIERS)}
          placeholder="Select supplier"
          searchPlaceholder="Search supplier…"
        />
        {isSubmitted && errors.supplier && (
          <p className="text-sm text-destructive">{errors.supplier.message}</p>
        )}
      </div>

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

      {mode === "add" && addForm ? (
        <StockInwardAddLengthRows
          form={addForm}
          profiles={profiles}
          isSubmitted={isSubmitted}
          idPrefix={idPrefix}
        />
      ) : editForm ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-total-weight`}>Total Weight (kg)</Label>
            <Input
              id={`${idPrefix}-total-weight`}
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter total weight"
              value={editTotalWeightKg || ""}
              onChange={(event) => handleEditWeightChange(Number(event.target.value) || 0)}
            />
            {isSubmitted && editForm.formState.errors.totalWeightKg && (
              <p className="text-sm text-destructive">
                {editForm.formState.errors.totalWeightKg.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-length-meter`}>Length (m)</Label>
            <ProfileLengthSelect
              profile={selectedProfile}
              value={editLengthInMeter}
              disabled={!selectedProfile}
              onChange={handleEditLengthChange}
            />
            {isSubmitted && editForm.formState.errors.lengthInMeter && (
              <p className="text-sm text-destructive">
                {editForm.formState.errors.lengthInMeter.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Length (ft)</Label>
              <Input
                readOnly
                className="bg-muted tabular-nums"
                value={editMetrics?.lengthFeet ? formatNumber(editMetrics.lengthFeet, 2) : ""}
                placeholder="Auto from profile length"
              />
            </div>
            <div className="space-y-2">
              <Label>Kg per meter</Label>
              <Input
                readOnly
                className="bg-muted tabular-nums"
                value={
                  selectedProfile || profileCode
                    ? formatNumber(getStockInwardKgPerMeter(selectedProfile), 2)
                    : ""
                }
                placeholder="From profile"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex h-5 items-center">
                <Label>Rate</Label>
              </div>
              <Input
                readOnly
                className="bg-muted tabular-nums"
                value={
                  selectedProfile ? formatNumber(getStockInwardRate(selectedProfile), 2) : ""
                }
                placeholder="From profile"
              />
            </div>
            <div className="space-y-2">
              <div className="flex h-5 items-center gap-1.5">
                <Label htmlFor={`${idPrefix}-total-profiles`}>{NOS_LABEL}</Label>
                <TotalProfilesHelp
                  totalWeightKg={editTotalWeightKg}
                  lengthInMeter={editLengthInMeter}
                  selectedProfile={selectedProfile}
                  totalProfiles={editTotalProfiles}
                />
              </div>
              <Input
                id={`${idPrefix}-total-profiles`}
                type="number"
                step="0.01"
                min="0"
                className="tabular-nums"
                placeholder={`Enter ${NOS_LABEL}`}
                value={editTotalProfiles || ""}
                onChange={(event) => handleEditProfilesChange(Number(event.target.value) || 0)}
              />
              {isSubmitted && editForm.formState.errors.totalProfiles && (
                <p className="text-sm text-destructive">
                  {editForm.formState.errors.totalProfiles.message}
                </p>
              )}
            </div>
          </div>
        </>
      ) : null}

      {mode === "add" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Kg per meter</Label>
            <Input
              readOnly
              className="bg-muted tabular-nums"
              value={
                selectedProfile || profileCode
                  ? formatNumber(getStockInwardKgPerMeter(selectedProfile), 2)
                  : ""
              }
              placeholder="From profile"
            />
          </div>
          <div className="space-y-2">
            <Label>Rate</Label>
            <Input
              readOnly
              className="bg-muted tabular-nums"
              value={selectedProfile ? formatNumber(getStockInwardRate(selectedProfile), 2) : ""}
              placeholder="From profile"
            />
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
