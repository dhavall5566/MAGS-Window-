"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { vendorFormSchema, type VendorFormData } from "@/lib/vendor-form";
import { VendorTypeSelect } from "@/components/vendors/vendor-type-select";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { formatPartyAddress } from "@/lib/vendor";
import type { Vendor } from "@/types";

interface EditVendorDialogProps {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    id: string,
    updates: Pick<
      Vendor,
      "partyName" | "partyAddress" | "personName" | "phoneNo" | "email" | "gstNo" | "vendorType"
    >
  ) => void;
}

export function EditVendorDialog({
  vendor,
  open,
  onOpenChange,
  onSave,
}: EditVendorDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isSubmitted },
  } = useForm<VendorFormData>({
    resolver: zodResolver(vendorFormSchema),
    mode: "onSubmit",
    reValidateMode: "onBlur",
    defaultValues: {
      partyName: "",
      partyAddress: "",
      personName: "",
      phoneNo: "",
      email: "",
      gstNo: "",
      vendorType: "delivery",
    },
  });

  useEffect(() => {
    if (open && vendor) {
      reset(
        {
          partyName: vendor.partyName,
          partyAddress: vendor.partyAddress,
          personName: vendor.personName,
          phoneNo: vendor.phoneNo,
          email: vendor.email,
          gstNo: vendor.gstNo ?? "",
          vendorType: vendor.vendorType,
        },
        { keepIsSubmitted: false }
      );
    }
  }, [open, vendor, reset]);

  const onSubmit = (data: VendorFormData) => {
    if (!vendor) return;
    onSave(vendor.id, {
      partyName: data.partyName.trim().toUpperCase(),
      partyAddress: formatPartyAddress(data.partyAddress),
      personName: data.personName?.trim() ?? "",
      phoneNo: data.phoneNo?.trim() ?? "",
      email: data.email?.trim() ?? "",
      gstNo: data.gstNo?.trim() ?? "",
      vendorType: data.vendorType,
    });
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Vendor"
      description="Update vendor details used on challans and deliveries."
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={() => onOpenChange(false)}
          submitLabel="Save Changes"
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
          disabled={!vendor}
        />
      }
    >
      <FormSection title="Vendor classification">
            <VendorTypeSelect
              id="edit-vendorType"
              value={watch("vendorType")}
              onChange={(value) => setValue("vendorType", value, { shouldValidate: isSubmitted })}
              error={resolveFieldError(isSubmitted, errors.vendorType)}
            />
          </FormSection>

          <FormSection title="Company details">
            <FormField
              label="Party Name"
              htmlFor="edit-partyName"
              required
              error={resolveFieldError(isSubmitted, errors.partyName)}
            >
              <Input
                id="edit-partyName"
                aria-invalid={fieldInvalid(isSubmitted, errors.partyName)}
                {...register("partyName")}
              />
            </FormField>
            <FormField
              label="Party Address"
              htmlFor="edit-partyAddress"
              required
              error={resolveFieldError(isSubmitted, errors.partyAddress)}
            >
              <Textarea
                id="edit-partyAddress"
                rows={3}
                aria-invalid={fieldInvalid(isSubmitted, errors.partyAddress)}
                {...register("partyAddress")}
              />
            </FormField>
            <FormField label="GST No." htmlFor="edit-gstNo" optional>
              <Input
                id="edit-gstNo"
                placeholder="e.g. 24AABCU9603R1ZM"
                className="uppercase"
                {...register("gstNo")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Contact information">
            <FormField label="Person Name" htmlFor="edit-personName" optional>
              <Input id="edit-personName" {...register("personName")} />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Phone No"
                htmlFor="edit-phoneNo"
                optional
                error={resolveFieldError(isSubmitted, errors.phoneNo)}
              >
                <Input
                  id="edit-phoneNo"
                  inputMode="tel"
                  aria-invalid={fieldInvalid(isSubmitted, errors.phoneNo)}
                  {...register("phoneNo")}
                />
              </FormField>
              <FormField
                label="Email"
                htmlFor="edit-email"
                optional
                error={resolveFieldError(isSubmitted, errors.email)}
              >
                <Input
                  id="edit-email"
                  type="email"
                  aria-invalid={fieldInvalid(isSubmitted, errors.email)}
                  {...register("email")}
                />
              </FormField>
            </div>
          </FormSection>
    </FormDialog>
  );
}
