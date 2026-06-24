"use client";

import { useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  formatProfileLengthLabel,
  getPrimaryProfileLength,
  getProfileLengthOptions,
} from "@/lib/profile";
import type { Profile } from "@/types";

interface ProfileLengthSelectProps {
  profile: Profile | null | undefined;
  value: number;
  onChange: (length: number) => void;
  disabled?: boolean;
  className?: string;
  /** Lengths already selected elsewhere; hidden from this dropdown. */
  excludeLengths?: number[];
}

export function ProfileLengthSelect({
  profile,
  value,
  onChange,
  disabled,
  className,
  excludeLengths,
}: ProfileLengthSelectProps) {
  const allOptions = useMemo(() => getProfileLengthOptions(profile), [profile]);
  const options = useMemo(
    () =>
      excludeLengths && excludeLengths.length > 0
        ? allOptions.filter(
            (length) => length === value || !excludeLengths.includes(length)
          )
        : allOptions,
    [allOptions, excludeLengths, value]
  );

  const selectOptions = useMemo(
    () =>
      options.map((length) => ({
        value: String(length),
        label: formatProfileLengthLabel(length),
      })),
    [options]
  );

  useEffect(() => {
    if (!profile || options.length === 0) return;
    if (!options.includes(value)) {
      onChange(options[0] ?? getPrimaryProfileLength(profile));
    }
  }, [profile, options, value, onChange]);

  if (options.length === 0) {
    return (
      <Input
        type="number"
        step="any"
        min="0.01"
        className={className}
        value={value || ""}
        disabled={disabled}
        placeholder="Select profile first"
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    );
  }

  const selectedValue = options.includes(value) ? value : getPrimaryProfileLength(profile);

  return (
    <SearchableSelect
      value={selectedValue > 0 ? String(selectedValue) : undefined}
      onValueChange={(next) => onChange(Number(next))}
      options={selectOptions}
      placeholder="Select length"
      searchPlaceholder="Search length…"
      disabled={disabled}
      className={className}
    />
  );
}
