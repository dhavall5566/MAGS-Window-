"use client";

import { FormField } from "@/components/shared/form-field";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { VENDOR_TYPE_OPTIONS } from "@/lib/vendor-form";
import type { VendorType } from "@/types";

interface VendorTypeSelectProps {
  id?: string;
  value: VendorType;
  onChange: (value: VendorType) => void;
  error?: string;
}

export function VendorTypeSelect({
  id = "vendorType",
  value,
  onChange,
  error,
}: VendorTypeSelectProps) {
  return (
    <FormField label="Vendor Type" htmlFor={id} required error={error}>
      <SearchableSelect
        id={id}
        value={value}
        onValueChange={(next) => onChange(next as VendorType)}
        options={VENDOR_TYPE_OPTIONS.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        placeholder="Select vendor type"
        searchable={false}
        aria-invalid={Boolean(error)}
      />
    </FormField>
  );
}
