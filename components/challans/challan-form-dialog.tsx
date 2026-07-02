"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray, useWatch, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, CircleHelp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  findProfileByCode,
  buildProfileByCodeMap,
  findProfileInMap,
  getProfileCodeValue,
  getPrimaryProfileLength,
  getProfileDesignImage,
  getProfileDisplayName,
  getProfileSelectOptions,
  getProfilesForPowderCoatingChallan,
  getPowderCoatingChallanRate,
  getProfilePowderCoatingRmmValue,
  resolvePowderCoatingInputRate,
  calculatePowderCoatingItemAmountFromValues,
  formatCurrency,
  POWDER_COATING_RATE_FIELD_LABEL,
  POWDER_COATING_FEET_RATE_LABEL,
  POWDER_COATING_RMM_FORMULA,
  POWDER_COATING_RATE_FORMULA,
  POWDER_COATING_AMOUNT_FORMULA,
  weightFromConversionUnit,
} from "@/lib/profile";
import {
  applyOutwardChallanToCoatingForm,
  findOutwardChallanById,
  formatOutwardChallanLabel,
  getOutwardChallanProjectName,
  getOutwardChallans,
  sumChallanItemQuantities,
  sumChallanItemWeights,
  resolveChallanItemWeight,
} from "@/lib/challan-outward";
import { buildOutwardConsumptionFromChallans } from "@/lib/challan-consumption";
import {
  findFirstOutwardStockIssue,
  formatOutwardLengthOption,
  getOutwardChallanLengthOptions,
  getOutwardLineStockIssue,
  hasOutwardStockIssues,
  OUTWARD_STOCK_UNAVAILABLE_MESSAGE,
  resolveOutwardChallanItemLength,
} from "@/lib/outward-challan-stock-lengths";
import {
  normalizeStockInwardRecord,
} from "@/lib/stock-inward-calculations";
import { mergeStockInward, normalizeStockLength } from "@/lib/stock-master";
import {
  findOutwardChallanIssuerById,
  findDeliveryChallanFromVendorById,
  getDefaultDeliveryChallanFromVendorId,
  getDefaultOutwardChallanVendorId,
  getDeliveryChallanFromDisplayName,
  getDeliveryChallanFromVendors,
  getOutwardChallanIssuerVendors,
} from "@/lib/outward-challan-branding";
import { cn, formatDecimalTrimmed, formatNumber, generateId, metersToFeet } from "@/lib/utils";
import { DEFAULT_APP_SETTINGS } from "@/lib/app-settings";
import { useAppStore } from "@/lib/store";
import {
  findVendorByPartyName,
  getVendorChallanDetails,
  getVendorPartyNames,
  getVendorsForChallanType,
  normalizeVendor,
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

const commonChallanSchema = z.object({
  challanNumber: z.string().min(1),
  date: z.string().min(1),
  vendorName: z.string().min(1, "Vendor is required"),
  vendorAddress: z.string().optional(),
  vendorPersonName: z.string().optional(),
  vendorContact: z.string().optional(),
  vendorGstNo: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const outwardSchema = commonChallanSchema.extend({
  deliveryChallanFromVendorId: z
    .string()
    .min(1, "Delivery Challan From is required"),
  vehicleNumber: z.string().trim().min(1, "Vehicle number is required"),
  driverName: z.string().trim().min(1, "Driver name is required"),
  projectName: z.string().optional(),
  totalBundles: z.string().optional(),
  totalWeightManual: z.string().optional(),
});

const coatingSchema = commonChallanSchema.extend({
  outwardChallanVendorId: z.string().min(1, "Outward challan vendor is required"),
  vehicleNumber: z.string().optional(),
  driverName: z.string().optional(),
  projectName: z.string().optional(),
  color: z.string().trim().min(1, "Color is required"),
  coatingRate: z.coerce.number().min(0, "Rate must be 0 or greater").optional(),
  sourceOutwardChallanId: z.string().optional(),
  sourceOutwardChallanNumber: z.string().optional(),
});

type OutwardForm = z.infer<typeof outwardSchema>;
type CoatingForm = z.infer<typeof coatingSchema>;

interface ChallanFormDialogProps {
  type: "outward" | "powder_coating";
  profiles: Profile[];
  vendors: Vendor[];
  onSave: (challan: Challan) => void | Promise<void>;
  challanToEdit?: Challan | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

function defaultChallanNumber(type: ChallanFormDialogProps["type"]) {
  const prefix = type === "outward" ? "OC" : "PC";
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
    length: type === "outward" ? 0 : length,
    qty: 1,
    weight: 0,
    ...(type === "powder_coating" ? { rate: 0 } : {}),
  };
}

function mapItemsForForm(
  items: Challan["items"],
  formType: ChallanFormDialogProps["type"],
  profiles: Profile[],
  coatingRate?: number | null
) {
  return (items ?? []).map((item) => {
    if (formType !== "powder_coating") return item;
    const profile = findProfileByCode(profiles, item.profileCode);
    if (!profile) return item;

    const length = Number(item.length) || getPrimaryProfileLength(profile);

    return {
      ...item,
      length,
      rate: getPowderCoatingChallanRate(profile, length, coatingRate),
    };
  });
}

function PowderCoatingRateHelp({
  profile,
  feetRate,
  coatingRate,
  lengthInFeet,
}: {
  profile?: Profile | null;
  feetRate: number;
  coatingRate?: number | null;
  lengthInFeet: number;
}) {
  const formulaRate = profile ? resolvePowderCoatingInputRate(coatingRate, profile) : 0;

  const content = useMemo(() => {
    if (!profile) {
      return (
        <>
          <p>{POWDER_COATING_RMM_FORMULA}</p>
          <p className="mt-1">{POWDER_COATING_RATE_FORMULA}</p>
          <p className="mt-1">{POWDER_COATING_AMOUNT_FORMULA}</p>
        </>
      );
    }

    const rmm = getProfilePowderCoatingRmmValue(profile);

    if (!rmm || !formulaRate || !lengthInFeet || !feetRate) {
      return (
        <>
          <p>{POWDER_COATING_RMM_FORMULA}</p>
          <p className="mt-1">{POWDER_COATING_RATE_FORMULA}</p>
          <p className="mt-1">{POWDER_COATING_AMOUNT_FORMULA}</p>
        </>
      );
    }

    return (
      <>
        <p>{POWDER_COATING_RMM_FORMULA}</p>
        <p className="mt-1.5 text-muted-foreground">RMM = {formatNumber(rmm, 2)}</p>
        <p className="mt-2">{POWDER_COATING_RATE_FORMULA}</p>
        <p className="mt-1.5 text-muted-foreground">
          ({formatNumber(rmm, 2)} / 305) × {formatNumber(formulaRate, 4)} ×{" "}
          {formatNumber(lengthInFeet, 2)} = {formatNumber(feetRate, 2)}
        </p>
        <p className="mt-2">{POWDER_COATING_AMOUNT_FORMULA}</p>
      </>
    );
  }, [feetRate, formulaRate, lengthInFeet, profile]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`How ${POWDER_COATING_FEET_RATE_LABEL} is calculated`}
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
  const createChallanIdRef = useRef<string | null>(null);
  const isEdit = Boolean(challanToEdit);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const defaultChallanLength = useAppStore((s) => s.settings.defaultChallanLength);
  const powderCoatingEntries = useAppStore((s) => s.powderCoating);
  const allChallans = useAppStore((s) => s.challans);
  const storeInward = useAppStore((s) => s.stockInward);
  const deletedStockInwardIds = useAppStore((s) => s.deletedStockInwardIds);

  const isPowderCoating = type === "powder_coating";
  const schema = isPowderCoating ? coatingSchema : outwardSchema;
  const normalizedVendors = useMemo(
    () => (vendors ?? []).map(normalizeVendor),
    [vendors]
  );
  const deliveryChallanFromVendors = useMemo(
    () => getDeliveryChallanFromVendors(normalizedVendors),
    [normalizedVendors]
  );
  const form = useForm<OutwardForm | CoatingForm>({
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
      ...(isPowderCoating
        ? {
            projectName: "",
            outwardChallanVendorId: getDefaultOutwardChallanVendorId(normalizedVendors),
            color: "",
            coatingRate: undefined,
            sourceOutwardChallanId: "",
            sourceOutwardChallanNumber: "",
          }
        : {
            projectName: "",
            deliveryChallanFromVendorId: getDefaultDeliveryChallanFromVendorId(normalizedVendors),
            totalBundles: "",
            totalWeightManual: "",
          }),
      items: [defaultItem(type, defaultChallanLength)],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const coatingValues = isPowderCoating ? (form.watch() as CoatingForm) : null;
  const coatingRate = isPowderCoating ? Number(coatingValues?.coatingRate) || 0 : 0;
  const outwardValues = !isPowderCoating ? (form.watch() as OutwardForm) : null;
  const vendorName = form.watch("vendorName");
  const watchedItems = useWatch({ control: form.control, name: "items" }) ?? [];

  const calculatedTotalNoOfProfiles =
    type === "outward" ? sumChallanItemQuantities(watchedItems) : 0;

  const calculatedTotalWeightAllProfiles =
    type === "outward" ? sumChallanItemWeights(watchedItems, profiles) : 0;

  const recalcPowderCoatingItemRates = useCallback(() => {
    if (!isPowderCoating) return;
    const manualRate = Number(form.getValues("coatingRate" as "coatingRate")) || 0;
    fields.forEach((_, index) => {
      const profileCode = form.getValues(`items.${index}.profileCode`);
      const profile = findProfileByCode(profiles, profileCode);
      if (!profile) return;
      const length = Number(form.getValues(`items.${index}.length`)) || 0;
      form.setValue(
        `items.${index}.rate`,
        getPowderCoatingChallanRate(profile, length, manualRate),
        { shouldValidate: true }
      );
    });
  }, [fields, form, isPowderCoating, profiles]);

  const outwardChallans = useMemo(
    () => getOutwardChallans(allChallans ?? []),
    [allChallans]
  );

  const mergedInward = useMemo(
    () =>
      mergeStockInward(
        [],
        (storeInward ?? []).map(normalizeStockInwardRecord),
        deletedStockInwardIds ?? []
      ),
    [storeInward, deletedStockInwardIds]
  );

  const stockConsumption = useMemo(() => {
    const consumption = buildOutwardConsumptionFromChallans([], allChallans ?? []);
    if (isEdit && challanToEdit?.id) {
      return consumption.filter((entry) => entry.challanId !== challanToEdit.id);
    }
    return consumption;
  }, [allChallans, isEdit, challanToEdit?.id]);

  const outwardStockBlocked = useMemo(() => {
    if (type !== "outward") return false;
    return hasOutwardStockIssues(watchedItems, mergedInward, stockConsumption);
  }, [type, watchedItems, mergedInward, stockConsumption]);

  const outwardChallanIssuerVendors = useMemo(
    () => getOutwardChallanIssuerVendors(normalizedVendors),
    [normalizedVendors]
  );

  const deliveryChallanFromVendor = useMemo(() => {
    const vendorId =
      outwardValues?.deliveryChallanFromVendorId ||
      getDefaultDeliveryChallanFromVendorId(normalizedVendors);
    return findDeliveryChallanFromVendorById(normalizedVendors, vendorId);
  }, [outwardValues?.deliveryChallanFromVendorId, normalizedVendors]);

  const outwardChallanVendorId = isPowderCoating
    ? (form.watch("outwardChallanVendorId" as "outwardChallanVendorId") as string)
    : "";

  const challanVendors = useMemo(
    () => getVendorsForChallanType(normalizedVendors, type),
    [normalizedVendors, type]
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

  const profileByCode = useMemo(
    () => buildProfileByCodeMap(profiles),
    [profiles]
  );

  const onVendorSelect = (partyName: string) => {
    const vendor = findVendorByPartyName(challanVendors, partyName);
    if (!vendor) {
      form.setValue("vendorName", partyName, { shouldValidate: true });
      form.setValue("vendorAddress", "");
      form.setValue("vendorPersonName", "");
      form.setValue("vendorContact", "");
      form.setValue("vendorGstNo", "");
      return;
    }

    const details = getVendorChallanDetails(vendor);
    form.setValue("vendorName", details.vendorName, { shouldValidate: true });
    form.setValue("vendorAddress", details.vendorAddress);
    form.setValue("vendorPersonName", details.vendorPersonName);
    form.setValue("vendorContact", details.vendorContact);
    form.setValue("vendorGstNo", details.vendorGstNo);
  };

  const onOutwardChallanSelect = (outwardId: string) => {
    if (!outwardId || outwardId === "__none__") {
      form.setValue("sourceOutwardChallanId", "");
      form.setValue("sourceOutwardChallanNumber", "");
      form.setValue("projectName" as "projectName", "");
      if (!isEdit) {
        form.setValue("challanNumber", defaultChallanNumber("powder_coating"), {
          shouldValidate: true,
        });
      }
      return;
    }

    const outward = findOutwardChallanById(allChallans ?? [], outwardId);
    if (!outward) return;

    const applied = applyOutwardChallanToCoatingForm(outward, profiles);
    form.setValue("challanNumber", applied.challanNumber, { shouldValidate: true });
    form.setValue("sourceOutwardChallanId", applied.sourceOutwardChallanId);
    form.setValue("sourceOutwardChallanNumber", applied.sourceOutwardChallanNumber);
    form.setValue("vehicleNumber", applied.vehicleNumber);
    form.setValue("driverName", applied.driverName);
    form.setValue("projectName" as "projectName", applied.projectName ?? "", {
      shouldValidate: true,
    });

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
      weightFromConversionUnit(profile, { length, qty }),
      { shouldValidate: true, shouldDirty: true, shouldTouch: true }
    );
    if (isPowderCoating) {
      const manualRate = Number(form.getValues("coatingRate" as "coatingRate")) || 0;
      form.setValue(
        `items.${index}.rate`,
        getPowderCoatingChallanRate(profile, length, manualRate),
        { shouldValidate: true }
      );
    }
  };

  useEffect(() => {
    if (!open || !isPowderCoating) return;
    recalcPowderCoatingItemRates();
  }, [open, isPowderCoating, fields.length, coatingRate, recalcPowderCoatingItemRates]);

  useEffect(() => {
    if (!open || isPowderCoating) return;
    const defaultId = getDefaultDeliveryChallanFromVendorId(normalizedVendors);
    if (!defaultId) return;
    const current = form.getValues("deliveryChallanFromVendorId");
    const stillValid = deliveryChallanFromVendors.some((vendor) => vendor.id === current);
    if (!current || !stillValid) {
      form.setValue("deliveryChallanFromVendorId" as "deliveryChallanFromVendorId", defaultId, {
        shouldValidate: true,
      });
    }
  }, [open, isPowderCoating, deliveryChallanFromVendors, normalizedVendors, form]);

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
        ...(challanToEdit.type === "powder_coating"
          ? {
              projectName: getOutwardChallanProjectName(challanToEdit),
              color: challanToEdit.color,
              coatingRate: challanToEdit.coatingRate ?? undefined,
              sourceOutwardChallanId: challanToEdit.sourceOutwardChallanId ?? "",
              sourceOutwardChallanNumber: challanToEdit.sourceOutwardChallanNumber ?? "",
              outwardChallanVendorId:
                challanToEdit.outwardChallanVendorId ??
                getDefaultOutwardChallanVendorId(normalizedVendors),
            }
          : {
              projectName: getOutwardChallanProjectName(challanToEdit),
              deliveryChallanFromVendorId:
                challanToEdit.type === "outward"
                  ? challanToEdit.deliveryChallanFromVendorId ??
                    getDefaultDeliveryChallanFromVendorId(normalizedVendors)
                  : getDefaultDeliveryChallanFromVendorId(normalizedVendors),
              totalBundles:
                challanToEdit.type === "outward" && challanToEdit.totalBundles != null
                  ? String(challanToEdit.totalBundles)
                  : "",
              totalWeightManual:
                challanToEdit.type === "outward" && challanToEdit.totalWeightManual != null
                  ? String(challanToEdit.totalWeightManual)
                  : "",
            }),
        items: mapItemsForForm(
          challanToEdit.items ?? [],
          type,
          profiles,
          challanToEdit.type === "powder_coating" ? challanToEdit.coatingRate : undefined
        ),
      } as OutwardForm | CoatingForm);
      replace(
        mapItemsForForm(
          challanToEdit.items ?? [],
          type,
          profiles,
          challanToEdit.type === "powder_coating" ? challanToEdit.coatingRate : undefined
        )
      );
      if (!challanToEdit.vendorAddress && challanToEdit.vendorName) {
        const vendor = findVendorByPartyName(normalizedVendors, challanToEdit.vendorName);
        if (vendor) {
          const details = getVendorChallanDetails(vendor);
          form.setValue("vendorAddress", details.vendorAddress);
          form.setValue("vendorPersonName", details.vendorPersonName);
          form.setValue("vendorContact", details.vendorContact);
          form.setValue("vendorGstNo", details.vendorGstNo);
        }
      }
    } else {
      createChallanIdRef.current = generateId("chl");
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
        ...(isPowderCoating
          ? {
              projectName: "",
              outwardChallanVendorId: getDefaultOutwardChallanVendorId(normalizedVendors),
              color: "",
              coatingRate: undefined,
              sourceOutwardChallanId: "",
              sourceOutwardChallanNumber: "",
            }
          : {
              projectName: "",
              deliveryChallanFromVendorId: getDefaultDeliveryChallanFromVendorId(normalizedVendors),
              totalBundles: "",
              totalWeightManual: "",
            }),
        items: [defaultItem(type, defaultChallanLength)],
      } as OutwardForm | CoatingForm);
    }
  }, [open, challanToEdit, type, form, replace, normalizedVendors, profiles, defaultChallanLength, isPowderCoating]);

  const onProfileSelect = (index: number, code: string) => {
    const profile = findProfileByCode(profiles, code);
    if (!profile) return;
    const profileCode = getProfileCodeValue(profile);
    const profileName = getProfileDisplayName(profile);
    form.setValue(`items.${index}.profileCode`, profileCode);
    form.setValue(`items.${index}.profileName`, profileName);
    form.setValue(`items.${index}.profileImage`, getProfileDesignImage(profile));
    const fallbackLength =
      getPrimaryProfileLength(profile) ||
      profile.standardLength ||
      defaultChallanLength;
    const length = isPowderCoating
      ? fallbackLength
      : resolveOutwardChallanItemLength(
          profileCode,
          profileName,
          mergedInward,
          stockConsumption,
          fallbackLength
        );
    form.setValue(`items.${index}.length`, length);
    if (isPowderCoating) {
      const manualRate = Number(form.getValues("coatingRate" as "coatingRate")) || 0;
      form.setValue(
        `items.${index}.rate`,
        getPowderCoatingChallanRate(profile, length, manualRate),
        { shouldValidate: true }
      );
    }
    updateItemWeight(index);
  };

  const onSubmit = (data: OutwardForm | CoatingForm) => {
    if (type === "outward") {
      const stockIssue = findFirstOutwardStockIssue(
        data.items,
        mergedInward,
        stockConsumption
      );
      if (stockIssue) {
        alert(`${stockIssue.message} (${stockIssue.profileCode})`);
        return;
      }
    }

    setOpen(false);

    queueMicrotask(() => {
      const coatingManualRate =
        isPowderCoating && Number((data as CoatingForm).coatingRate) > 0
          ? Number((data as CoatingForm).coatingRate)
          : undefined;
      const items =
        isPowderCoating
          ? data.items.map((item) => {
              const profile = findProfileInMap(profileByCode, item.profileCode);
              const length = Number(item.length) || 0;
              return {
                ...item,
                rate: profile
                  ? getPowderCoatingChallanRate(profile, length, coatingManualRate)
                  : item.rate ?? 0,
              };
            })
          : data.items.map(({ rate: _rate, ...item }) => {
              const profile = findProfileInMap(profileByCode, item.profileCode);
              const length = Number(item.length) || 0;
              const qty = Number(item.qty) || 0;
              return {
                ...item,
                weight:
                  profile && length > 0 && qty > 0
                    ? weightFromConversionUnit(profile, { length, qty })
                    : Math.max(0, Number(item.weight) || 0),
              };
            });

      const base = {
        id: challanToEdit?.id ?? createChallanIdRef.current ?? generateId("chl"),
        challanNumber: data.challanNumber,
        date: data.date,
        vendorName: data.vendorName,
        vendorAddress: data.vendorAddress,
        vendorPersonName: data.vendorPersonName,
        vendorContact: data.vendorContact,
        vendorGstNo: data.vendorGstNo?.trim().toUpperCase() ?? "",
        vehicleNumber: data.vehicleNumber?.trim() ?? "",
        driverName: data.driverName?.trim() ?? "",
        items,
      };

      let challan: Challan;
      if (type === "outward") {
        const outwardData = data as OutwardForm;
        const totalBundlesRaw = outwardData.totalBundles?.trim();
        const totalBundles =
          totalBundlesRaw && !Number.isNaN(Number(totalBundlesRaw))
            ? Math.max(0, Math.trunc(Number(totalBundlesRaw)))
            : undefined;
        const totalWeightManualRaw = outwardData.totalWeightManual?.trim();
        const totalWeightManual =
          totalWeightManualRaw && !Number.isNaN(Number(totalWeightManualRaw))
            ? Math.max(0, Math.round(Number(totalWeightManualRaw) * 100) / 100)
            : undefined;
        const totalNoOfProfiles = sumChallanItemQuantities(data.items);
        const totalWeightAllProfiles =
          Math.round(
            data.items.reduce((sum, item) => {
              const profile = findProfileInMap(profileByCode, item.profileCode);
              const length = Number(item.length) || 0;
              const qty = Number(item.qty) || 0;
              if (profile && length > 0 && qty > 0) {
                return sum + weightFromConversionUnit(profile, { length, qty });
              }
              return sum + Math.max(0, Number(item.weight) || 0);
            }, 0) * 100
          ) / 100;
        const deliveryIssuer = findDeliveryChallanFromVendorById(
          normalizedVendors,
          outwardData.deliveryChallanFromVendorId
        );
        challan = {
          ...base,
          type: "outward",
          deliveryChallanFromVendorId: outwardData.deliveryChallanFromVendorId,
          deliveryChallanFromVendorName:
            deliveryIssuer?.challanHeaderName?.trim() || deliveryIssuer?.partyName,
          projectName: outwardData.projectName?.trim() || undefined,
          totalBundles,
          totalWeightManual,
          totalWeightAllProfiles,
          totalNoOfProfiles,
        };
      } else {
        const coatingData = data as CoatingForm;
        const issuer = findOutwardChallanIssuerById(
          normalizedVendors,
          coatingData.outwardChallanVendorId
        );
        challan = {
          ...base,
          type: "powder_coating",
          outwardChallanVendorId: coatingData.outwardChallanVendorId,
          outwardChallanVendorName:
            issuer?.challanHeaderName?.trim() || issuer?.partyName,
          projectName: coatingData.projectName?.trim() || undefined,
          color: coatingData.color.trim() as CoatingColor,
          coatingRate: coatingManualRate,
          sourceOutwardChallanId: coatingData.sourceOutwardChallanId?.trim() || undefined,
          sourceOutwardChallanNumber: coatingData.sourceOutwardChallanNumber?.trim() || undefined,
        };
      }

      void onSave(challan);
    });
  };

  const title =
    type === "outward"
      ? isEdit
        ? "Edit Outward Challan"
        : "New Outward Challan"
      : isEdit
        ? "Edit Powder Coating Challan"
        : "New Powder Coating Challan";

  const dialog = (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      size="2xl"
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
          disabled={outwardStockBlocked}
        />
      }
    >
      <TooltipProvider delayDuration={150}>
          <FormSection title="Challan details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {type === "outward" && (
              <FormField
                label="Delivery Challan From"
                required
                className="sm:col-span-2"
                error={resolveFieldError(
                  form.formState.isSubmitted,
                  (form.formState.errors as FieldErrors<OutwardForm>).deliveryChallanFromVendorId
                )}
              >
                <input type="hidden" {...form.register("deliveryChallanFromVendorId")} />
                <Input
                  readOnly
                  value={getDeliveryChallanFromDisplayName(deliveryChallanFromVendor)}
                  placeholder="Add a vendor with type Delivery Challan From"
                  className="cursor-default bg-muted/60"
                  aria-readonly
                />
              </FormField>
            )}
            {isPowderCoating && (
              <FormField
                label="Powder Coating"
                required
                className="sm:col-span-2"
                error={resolveFieldError(
                  form.formState.isSubmitted,
                  (form.formState.errors as FieldErrors<CoatingForm>).outwardChallanVendorId
                )}
              >
                <SearchableSelect
                  value={outwardChallanVendorId || undefined}
                  onValueChange={(value) =>
                    form.setValue("outwardChallanVendorId" as "outwardChallanVendorId", value, {
                      shouldValidate: true,
                    })
                  }
                  options={outwardChallanIssuerVendors.map((vendor) => ({
                    value: vendor.id,
                    label: vendor.challanHeaderName?.trim() || vendor.partyName,
                  }))}
                  placeholder="Select powder coating vendor"
                  searchPlaceholder="Search powder coating vendor…"
                  aria-invalid={fieldInvalid(
                    form.formState.isSubmitted,
                    (form.formState.errors as FieldErrors<CoatingForm>).outwardChallanVendorId
                  )}
                />
              </FormField>
            )}
            <FormField
              label="Challan Number"
              required
              error={resolveFieldError(form.formState.isSubmitted, form.formState.errors.challanNumber)}
            >
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.challanNumber)}
                readOnly={isPowderCoating && Boolean(coatingValues?.sourceOutwardChallanId)}
                className={
                  isPowderCoating && coatingValues?.sourceOutwardChallanId ? "bg-muted" : undefined
                }
                placeholder={
                  isPowderCoating ? "Select outward challan to auto-fill (PC-{no.})" : undefined
                }
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
                  Loads challan number (e.g. PC-2026-8432), project name, profile, quantity,
                  length, rate, vehicle number, and driver from the outward challan. Vendor and
                  color are not changed.
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
            <FormField
              label="Vehicle Number"
              required={type === "outward"}
              error={
                form.formState.isSubmitted
                  ? form.formState.errors.vehicleNumber?.message
                  : undefined
              }
            >
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.vehicleNumber)}
                {...form.register("vehicleNumber")}
              />
            </FormField>
            <FormField
              label="Driver Name"
              required={type === "outward"}
              error={
                form.formState.isSubmitted
                  ? form.formState.errors.driverName?.message
                  : undefined
              }
            >
              <Input
                aria-invalid={fieldInvalid(form.formState.isSubmitted, form.formState.errors.driverName)}
                {...form.register("driverName")}
              />
            </FormField>
            {type === "powder_coating" && (
              <>
                <FormField
                  label="Color"
                  required
                  error={resolveFieldError(
                    form.formState.isSubmitted,
                    (form.formState.errors as FieldErrors<CoatingForm>).color
                  )}
                >
                  <Input
                    aria-invalid={fieldInvalid(
                      form.formState.isSubmitted,
                      (form.formState.errors as FieldErrors<CoatingForm>).color
                    )}
                    placeholder="Enter color"
                    {...form.register("color")}
                  />
                </FormField>
                <FormField
                  label={POWDER_COATING_RATE_FIELD_LABEL}
                  error={resolveFieldError(
                    form.formState.isSubmitted,
                    (form.formState.errors as FieldErrors<CoatingForm>).coatingRate
                  )}
                >
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    aria-invalid={fieldInvalid(
                      form.formState.isSubmitted,
                      (form.formState.errors as FieldErrors<CoatingForm>).coatingRate
                    )}
                    placeholder="Enter rate"
                    {...form.register("coatingRate", {
                      onChange: () => recalcPowderCoatingItemRates(),
                    })}
                  />
                </FormField>
              </>
            )}
          </div>
          </FormSection>

          {isPowderCoating ? (
            <FormField label="Project Name" optional>
              <Textarea
                readOnly={Boolean(coatingValues?.sourceOutwardChallanId)}
                className={coatingValues?.sourceOutwardChallanId ? "bg-muted" : undefined}
                rows={2}
                placeholder={
                  coatingValues?.sourceOutwardChallanId
                    ? "Auto-filled from outward challan"
                    : "Enter project name or select outward challan"
                }
                {...form.register("projectName")}
              />
            </FormField>
          ) : (
            <FormField label="Project Name" optional>
              <Textarea
                {...form.register("projectName")}
                rows={2}
                placeholder="Optional project name for this challan"
              />
            </FormField>
          )}

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
                onClick={() => {
                  append(defaultItem(type, defaultChallanLength));
                }}
              >
                Add Item
              </Button>
            </div>
            {fields.map((field, index) => {
              const itemProfileCode = form.watch(`items.${index}.profileCode`);
              const itemProfileName = form.watch(`items.${index}.profileName`);
              const itemProfile = findProfileByCode(profiles, itemProfileCode);
              const itemLength = form.watch(`items.${index}.length`);
              const itemQty = form.watch(`items.${index}.qty`);
              const lengthOptions =
                type === "outward" && itemProfileCode
                  ? getOutwardChallanLengthOptions(
                      itemProfileCode,
                      itemProfileName,
                      mergedInward,
                      stockConsumption,
                      Number(itemLength) || 0
                    )
                  : [];
              const profileHasNoStock =
                type === "outward" && Boolean(itemProfileCode) && lengthOptions.length === 0;
              const normalizedItemLength = normalizeStockLength(Number(itemLength) || 0);
              const itemWeight = itemProfile
                ? resolveChallanItemWeight(
                    {
                      profileCode: itemProfileCode,
                      length: Number(itemLength) || 0,
                      qty: Number(itemQty) || 0,
                      weight: Number(form.watch(`items.${index}.weight`)) || 0,
                    },
                    profiles
                  )
                : 0;

              const itemRmtrRate = itemProfile
                ? getPowderCoatingChallanRate(
                    itemProfile,
                    Number(itemLength) || 0,
                    coatingRate
                  )
                : 0;
              const itemAmount = calculatePowderCoatingItemAmountFromValues(
                Number(itemLength) || 0,
                Number(itemQty) || 0,
                itemRmtrRate
              );
              const itemLengthFeet = metersToFeet(normalizedItemLength);
              const outwardStockIssue =
                type === "outward" && itemProfileCode
                  ? profileHasNoStock
                    ? OUTWARD_STOCK_UNAVAILABLE_MESSAGE
                    : getOutwardLineStockIssue(
                        {
                          profileCode: itemProfileCode,
                          profileName: itemProfileName,
                          length: Number(itemLength) || 0,
                          qty: Number(itemQty) || 0,
                        },
                        (watchedItems ?? []).map((item) => ({
                          profileCode: item.profileCode,
                          profileName: item.profileName,
                          length: Number(item.length) || 0,
                          qty: Number(item.qty) || 0,
                        })),
                        mergedInward,
                        stockConsumption
                      )
                  : null;
              const outwardLineInputsDisabled = Boolean(outwardStockIssue);

              return (
              <div
                key={field.id}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border p-3",
                  outwardStockIssue && "border-destructive/50 bg-destructive/5"
                )}
              >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-[2] space-y-1">
                  <Label className="text-xs">Profile</Label>
                  <SearchableSelect
                    className="w-full"
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
                {isPowderCoating ? (
                  <>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Length (m)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="w-full min-w-0 tabular-nums"
                        {...form.register(`items.${index}.length`, {
                          onChange: () => updateItemWeight(index),
                        })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Length (ft)</Label>
                      <Input
                        readOnly
                        className="w-full min-w-0 bg-muted tabular-nums"
                        value={itemLengthFeet > 0 ? formatNumber(itemLengthFeet, 2) : ""}
                        aria-readonly
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">{POWDER_COATING_RATE_FIELD_LABEL}</Label>
                      <Input
                        readOnly
                        disabled
                        className="w-full min-w-0 bg-muted tabular-nums"
                        value={coatingRate > 0 ? formatDecimalTrimmed(coatingRate) : ""}
                        aria-readonly
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex h-5 items-center gap-1.5">
                        <Label className="text-xs">{POWDER_COATING_FEET_RATE_LABEL}</Label>
                        <PowderCoatingRateHelp
                          profile={itemProfile}
                          feetRate={itemRmtrRate}
                          coatingRate={coatingRate}
                          lengthInFeet={itemLengthFeet}
                        />
                      </div>
                      <Input
                        type="number"
                        step="any"
                        min="0"
                        className="w-full min-w-0 bg-muted tabular-nums"
                        readOnly
                        value={itemRmtrRate > 0 ? itemRmtrRate : ""}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        className="w-full min-w-0"
                        {...form.register(`items.${index}.qty`, {
                          onChange: () => updateItemWeight(index),
                        })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        className="w-full min-w-0 bg-muted tabular-nums"
                        readOnly
                        value={itemAmount > 0 ? formatCurrency(itemAmount) : ""}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Length (m)</Label>
                      <SearchableSelect
                        className="w-full"
                        searchable={lengthOptions.length > 8}
                        disabled={!itemProfileCode || outwardLineInputsDisabled}
                        value={
                          normalizedItemLength > 0 ? String(normalizedItemLength) : ""
                        }
                        onValueChange={(value) => {
                          form.setValue(`items.${index}.length`, Number(value) || 0, {
                            shouldValidate: true,
                          });
                          updateItemWeight(index);
                        }}
                        options={lengthOptions.map((length) => ({
                          value: String(length),
                          label: formatOutwardLengthOption(length),
                        }))}
                        placeholder={
                          itemProfileCode ? "Select length" : "Select profile first"
                        }
                        emptyText="No stock available"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Qty</Label>
                      <Input
                        type="number"
                        disabled={outwardLineInputsDisabled}
                        className={cn(
                          "w-full min-w-0",
                          outwardLineInputsDisabled && "bg-muted"
                        )}
                        {...form.register(`items.${index}.qty`, {
                          onChange: () => updateItemWeight(index),
                        })}
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <Label className="text-xs">Total Weight</Label>
                      <Input
                        className="w-full min-w-0 bg-muted tabular-nums"
                        readOnly
                        value={
                          itemProfile && Number(itemWeight) > 0
                            ? `${formatNumber(Number(itemWeight), 2)} kg`
                            : "—"
                        }
                      />
                    </div>
                  </>
                )}
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 self-end text-muted-foreground hover:text-destructive"
                    onClick={() => remove(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {outwardStockIssue ? (
                <p className="text-xs font-medium text-destructive">{outwardStockIssue}</p>
              ) : null}
              </div>
            );
            })}
          </div>
          {form.formState.isSubmitted && form.formState.errors.items?.message && (
            <p className="text-xs text-destructive">{String(form.formState.errors.items.message)}</p>
          )}
          </FormSection>

          {type === "outward" && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Total Bundles" optional>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="Enter total bundles"
                    {...form.register("totalBundles")}
                  />
                </FormField>
                <FormField label="Total Weight Manual" optional>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="Enter total weight in kg"
                    className="tabular-nums"
                    {...form.register("totalWeightManual")}
                  />
                </FormField>
              </div>
              <FormField label="Total Weight of All Profiles">
                <Input
                  readOnly
                  className="bg-muted tabular-nums"
                  value={
                    calculatedTotalWeightAllProfiles > 0
                      ? `${formatNumber(calculatedTotalWeightAllProfiles, 2)} kg`
                      : "—"
                  }
                />
              </FormField>
              <FormField label="Total No. of Profiles">
                <Input
                  readOnly
                  className="bg-muted tabular-nums"
                  value={String(calculatedTotalNoOfProfiles)}
                />
              </FormField>
            </>
          )}
      </TooltipProvider>
    </FormDialog>
  );

  return dialog;
}
