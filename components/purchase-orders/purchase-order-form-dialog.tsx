"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { SearchableSelect, stringSelectOptions } from "@/components/ui/searchable-select";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import {
  buildPurchaseOrder,
  buildPurchaseOrderItemFromProfile,
  computePurchaseOrderItemWeight,
  defaultPurchaseOrderItem,
  generatePurchaseOrderNumber,
  getPurchaseOrderTotalWeight,
  purchaseOrderFormSchema,
  type PurchaseOrderFormData,
} from "@/lib/purchase-order-form";
import { findProfileByCode, getProfileSelectOptions } from "@/lib/profile";
import { findVendorByPartyName, getVendorPartyNames } from "@/lib/vendor";
import { formatNumber, generateId } from "@/lib/utils";
import type { Profile, PurchaseOrder, Vendor } from "@/types";

interface PurchaseOrderFormDialogProps {
  profiles: Profile[];
  vendors: Vendor[];
  existingOrders: PurchaseOrder[];
  onSave: (order: PurchaseOrder) => void;
  orderToEdit?: PurchaseOrder | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

function buildDefaultValues(
  type: "create" | "edit",
  poNumber: string
): PurchaseOrderFormData {
  return {
    poNumber: type === "create" ? poNumber : "",
    date: new Date().toISOString().split("T")[0],
    vendorName: "",
    vendorAddress: "",
    vehicleNumber: "",
    remarks: "",
    items: [defaultPurchaseOrderItem()],
  };
}

export function PurchaseOrderFormDialog({
  profiles,
  vendors,
  existingOrders,
  onSave,
  orderToEdit = null,
  open: controlledOpen,
  onOpenChange,
  showTrigger = true,
}: PurchaseOrderFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isEdit = Boolean(orderToEdit);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: buildDefaultValues("create", generatePurchaseOrderNumber(existingOrders)),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting, isSubmitted },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const vendorName = watch("vendorName");
  const watchedItems = watch("items");

  const profileOptions = useMemo(() => getProfileSelectOptions(profiles), [profiles]);
  const vendorOptions = useMemo(() => getVendorPartyNames(vendors), [vendors]);

  const totalWeight = useMemo(
    () => getPurchaseOrderTotalWeight({ items: watchedItems ?? [] }),
    [watchedItems]
  );

  useEffect(() => {
    if (!open) return;
    if (orderToEdit) {
      form.reset({
        poNumber: orderToEdit.poNumber,
        date: orderToEdit.date,
        vendorName: orderToEdit.vendorName,
        vendorAddress: orderToEdit.vendorAddress ?? "",
        vehicleNumber: orderToEdit.vehicleNumber ?? "",
        remarks: orderToEdit.remarks ?? "",
        items:
          orderToEdit.items?.length > 0
            ? orderToEdit.items.map((item) => ({ ...item }))
            : [defaultPurchaseOrderItem()],
      });
    } else {
      form.reset(buildDefaultValues("create", generatePurchaseOrderNumber(existingOrders)));
    }
  }, [open, orderToEdit, existingOrders, form]);

  const onVendorSelect = (partyName: string) => {
    const vendor = findVendorByPartyName(vendors, partyName);
    setValue("vendorName", partyName, { shouldValidate: isSubmitted });
    setValue("vendorAddress", vendor?.partyAddress ?? "");
  };

  const recalcWeight = (index: number) => {
    const item = form.getValues(`items.${index}`);
    setValue(
      `items.${index}.totalWeightKg`,
      computePurchaseOrderItemWeight(
        Number(item.kgPerMeter) || 0,
        Number(item.length) || 0,
        Number(item.qty) || 0
      ),
      { shouldValidate: isSubmitted }
    );
  };

  const onProfileSelect = (index: number, code: string) => {
    const profile = findProfileByCode(profiles, code);
    if (!profile) {
      setValue(`items.${index}.profileCode`, code, { shouldValidate: isSubmitted });
      return;
    }
    const details = buildPurchaseOrderItemFromProfile(profile);
    setValue(`items.${index}.profileCode`, details.profileCode, { shouldValidate: isSubmitted });
    setValue(`items.${index}.profileName`, details.profileName);
    setValue(`items.${index}.profileImage`, details.profileImage);
    setValue(`items.${index}.kgPerMeter`, details.kgPerMeter);
    recalcWeight(index);
  };

  const onSubmit = (data: PurchaseOrderFormData) => {
    const order = buildPurchaseOrder(data, profiles, {
      id: orderToEdit?.id ?? generateId("po"),
    });
    onSave(order);
    setOpen(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      size="xl"
      title={isEdit ? "Edit Purchase Order" : "New Purchase Order"}
      description="Issue a purchase order to a supplier with profile drawings, lengths, and weights."
      trigger={
        showTrigger && !isEdit ? (
          <Button>
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </Button>
        ) : undefined
      }
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => setOpen(false)}
          submitLabel={isEdit ? "Save Changes" : "Create Purchase Order"}
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
          disabled={profiles.length === 0}
        />
      }
    >
      <FormSection title="Order details">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            label="PO / D.C. No"
            htmlFor="poNumber"
            required
            error={resolveFieldError(isSubmitted, errors.poNumber)}
          >
            <Input
              id="poNumber"
              placeholder="e.g. AEIL/02/26-27"
              aria-invalid={fieldInvalid(isSubmitted, errors.poNumber)}
              {...register("poNumber")}
            />
          </FormField>
          <FormField
            label="Date"
            htmlFor="poDate"
            required
            error={resolveFieldError(isSubmitted, errors.date)}
          >
            <Input
              id="poDate"
              type="date"
              aria-invalid={fieldInvalid(isSubmitted, errors.date)}
              {...register("date")}
            />
          </FormField>
          <div className="space-y-2 sm:col-span-2">
            <Label>Party Name</Label>
            <SearchableSelect
              value={vendorName || undefined}
              onValueChange={onVendorSelect}
              options={stringSelectOptions(vendorOptions)}
              placeholder="Select supplier / party"
              searchPlaceholder="Search party…"
              aria-invalid={fieldInvalid(isSubmitted, errors.vendorName)}
            />
            {isSubmitted && errors.vendorName && (
              <p className="text-sm text-destructive">{errors.vendorName.message}</p>
            )}
          </div>
          <FormField label="Address" htmlFor="vendorAddress" optional className="sm:col-span-2">
            <Textarea
              id="vendorAddress"
              rows={2}
              placeholder="Party address"
              {...register("vendorAddress")}
            />
          </FormField>
          <FormField label="V. Number" htmlFor="vehicleNumber" optional>
            <Input id="vehicleNumber" placeholder="Vehicle number" {...register("vehicleNumber")} />
          </FormField>
        </div>
      </FormSection>

      <FormSection
        title="Line items"
        description="Add profiles, lengths (mm), quantity, and total weight for each row."
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Items</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(defaultPurchaseOrderItem())}
            >
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>

          {fields.map((field, index) => {
            const itemCode = watch(`items.${index}.profileCode`);
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 items-end gap-3 rounded-lg border p-3 sm:grid-cols-2 xl:grid-cols-12"
              >
                <div className="space-y-1 sm:col-span-2 xl:col-span-4">
                  <Label className="text-xs">Profile (Dia Code)</Label>
                  <SearchableSelect
                    value={itemCode || undefined}
                    onValueChange={(value) => onProfileSelect(index, value)}
                    options={profileOptions.map((option) => ({
                      value: option.value,
                      label: option.label,
                    }))}
                    placeholder="Select profile"
                    searchPlaceholder="Search profile…"
                  />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label className="text-xs">KG/MTR</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0"
                    {...register(`items.${index}.kgPerMeter`, {
                      onChange: () => recalcWeight(index),
                    })}
                  />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label className="text-xs">Length (MM)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0"
                    aria-invalid={fieldInvalid(
                      isSubmitted,
                      errors.items?.[index]?.length
                    )}
                    {...register(`items.${index}.length`, {
                      onChange: () => recalcWeight(index),
                    })}
                  />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label className="text-xs">Qty</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0"
                    {...register(`items.${index}.qty`, {
                      onChange: () => recalcWeight(index),
                    })}
                  />
                </div>
                <div className="space-y-1 xl:col-span-2">
                  <Label className="text-xs">Total Weight (KG)</Label>
                  <Input
                    type="number"
                    step="any"
                    min="0"
                    className="min-w-0"
                    aria-invalid={fieldInvalid(
                      isSubmitted,
                      errors.items?.[index]?.totalWeightKg
                    )}
                    {...register(`items.${index}.totalWeightKg`)}
                  />
                </div>
                {fields.length > 1 && (
                  <div className="sm:col-span-2 xl:col-span-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {isSubmitted && errors.items?.message && (
            <p className="text-xs text-destructive">{String(errors.items.message)}</p>
          )}

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2.5 text-sm">
            <span className="font-medium text-muted-foreground">Total Weight</span>
            <span className="font-semibold tabular-nums">{formatNumber(totalWeight, 2)} KG</span>
          </div>
        </div>
      </FormSection>

      <FormField label="Remarks" htmlFor="remarks" optional>
        <Textarea
          id="remarks"
          rows={2}
          placeholder="Optional notes for this purchase order"
          {...register("remarks")}
        />
      </FormField>
    </FormDialog>
  );
}
