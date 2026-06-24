import type { CoatingColor } from "@/types";

const VENDOR_COATING_COLORS: Record<string, CoatingColor[]> = {
  Umiya: ["Black", "White"],
  MAGS: ["Blue", "Yellow", "Green"],
};

export function getCoatingColorsForVendor(vendorName: string): CoatingColor[] {
  const normalized = vendorName.trim().toLowerCase();
  if (!normalized) return [];

  const match = Object.entries(VENDOR_COATING_COLORS).find(
    ([name]) => name.toLowerCase() === normalized
  );

  return match ? [...match[1]] : [];
}

export function isCoatingColorAllowedForVendor(
  vendorName: string,
  color: string
): boolean {
  const allowed = getCoatingColorsForVendor(vendorName);
  if (!allowed.length) return false;
  return allowed.includes(color as CoatingColor);
}
