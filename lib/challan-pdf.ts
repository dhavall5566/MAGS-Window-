import type { Challan, Profile, Vendor } from "@/types";
import { generateChallanDocumentPDF } from "./powder-coating-challan-pdf";

/** PDF export for outward and powder coating challans (shared compact header). */
export async function generateChallanPDF(
  challan: Challan,
  profiles: Profile[] = [],
  vendors: Vendor[] = []
): Promise<void> {
  await generateChallanDocumentPDF(challan, profiles, vendors);
}
