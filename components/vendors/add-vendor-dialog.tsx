"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormDialog } from "@/components/shared/form-dialog";
import { FormDialogActions } from "@/components/shared/form-dialog-actions";
import { FormField, FormSection } from "@/components/shared/form-field";
import { vendorFormSchema, type VendorFormData } from "@/lib/vendor-form";
import { VendorTypeSelect } from "@/components/vendors/vendor-type-select";
import { fieldInvalid, resolveFieldError } from "@/lib/form-utils";
import { formatPartyAddress } from "@/lib/vendor";
import { generateId } from "@/lib/utils";
import type { Vendor } from "@/types";

interface AddVendorDialogProps {
  onSave: (vendor: Vendor) => void;
}

export function AddVendorDialog({ onSave }: AddVendorDialogProps) {
  const [open, setOpen] = useState(false);
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
      vendorType: "delivery",
    },
  });

  const closeDialog = () => {
    setOpen(false);
    reset();
  };

  const onSubmit = (data: VendorFormData) => {
    onSave({
      id: generateId("ven"),
      partyName: data.partyName.trim().toUpperCase(),
      partyAddress: formatPartyAddress(data.partyAddress),
      personName: data.personName?.trim() ?? "",
      phoneNo: data.phoneNo?.trim() ?? "",
      email: data.email?.trim() ?? "",
      vendorType: data.vendorType,
    });
    closeDialog();
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : closeDialog())}
      title="Add New Vendor"
      description="Register a delivery or powder coating vendor for challans and stock operations."
      trigger={
        <Button>
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      }
      onSubmit={handleSubmit(onSubmit)}
      footer={
        <FormDialogActions
          onCancel={closeDialog}
          submitLabel="Save Vendor"
          loadingLabel="Saving"
          isSubmitting={isSubmitting}
        />
      }
    >
      <FormSection title="Vendor classification">
            <VendorTypeSelect
              value={watch("vendorType")}
              onChange={(value) => setValue("vendorType", value, { shouldValidate: isSubmitted })}
              error={resolveFieldError(isSubmitted, errors.vendorType)}
            />
          </FormSection>

          <FormSection title="Company details">
            <FormField
              label="Party Name"
              htmlFor="partyName"
              required
              error={resolveFieldError(isSubmitted, errors.partyName)}
            >
              <Input
                id="partyName"
                placeholder="Vendor company name"
                aria-invalid={fieldInvalid(isSubmitted, errors.partyName)}
                {...register("partyName")}
              />
            </FormField>
            <FormField
              label="Party Address"
              htmlFor="partyAddress"
              required
              error={resolveFieldError(isSubmitted, errors.partyAddress)}
            >
              <Textarea
                id="partyAddress"
                placeholder="Full address"
                rows={3}
                aria-invalid={fieldInvalid(isSubmitted, errors.partyAddress)}
                {...register("partyAddress")}
              />
            </FormField>
          </FormSection>

          <FormSection title="Contact information" description="Optional contact for challans and correspondence.">
            <FormField label="Person Name" htmlFor="personName" optional>
              <Input
                id="personName"
                placeholder="Contact person"
                {...register("personName")}
              />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Phone No"
                htmlFor="phoneNo"
                optional
                error={resolveFieldError(isSubmitted, errors.phoneNo)}
              >
                <Input
                  id="phoneNo"
                  placeholder="e.g. +91 98765 43210"
                  inputMode="tel"
                  aria-invalid={fieldInvalid(isSubmitted, errors.phoneNo)}
                  {...register("phoneNo")}
                />
              </FormField>
              <FormField
                label="Email"
                htmlFor="email"
                optional
                error={resolveFieldError(isSubmitted, errors.email)}
              >
                <Input
                  id="email"
                  type="email"
                  placeholder="e.g. contact@vendor.com"
                  aria-invalid={fieldInvalid(isSubmitted, errors.email)}
                  {...register("email")}
                />
              </FormField>
            </div>
          </FormSection>
    </FormDialog>
  );
}
