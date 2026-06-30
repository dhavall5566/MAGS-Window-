import type { Challan, PowderCoating, PurchaseOrder, StockInward, Vendor } from "@/types";
import { buildRecordHref, type RecordModuleKey } from "@/lib/record-navigation";

export interface VendorAssociationRecord {
  id: string;
  label: string;
  href: string;
}

export interface VendorAssociationGroup {
  module: string;
  count: number;
  label: string;
  records: VendorAssociationRecord[];
}

function normalizeName(value: string | undefined | null): string {
  return value?.trim().toLowerCase() ?? "";
}

function vendorNameAliases(vendor: Vendor): Set<string> {
  const aliases = new Set<string>();
  const party = normalizeName(vendor.partyName);
  const header = normalizeName(vendor.challanHeaderName);
  if (party) aliases.add(party);
  if (header) aliases.add(header);
  return aliases;
}

function matchesVendorName(vendor: Vendor, value: string | undefined | null): boolean {
  const normalized = normalizeName(value);
  if (!normalized) return false;
  return vendorNameAliases(vendor).has(normalized);
}

function matchesVendorId(vendor: Vendor, value: string | undefined | null): boolean {
  return Boolean(value?.trim() && value.trim() === vendor.id);
}

function isChallanLinkedToVendor(challan: Challan, vendor: Vendor): boolean {
  if (matchesVendorName(vendor, challan.vendorName)) return true;

  if (challan.type === "outward") {
    return (
      matchesVendorName(vendor, challan.deliveryChallanFromVendorName) ||
      matchesVendorId(vendor, challan.deliveryChallanFromVendorId)
    );
  }

  if (challan.type === "powder_coating") {
    return (
      matchesVendorName(vendor, challan.outwardChallanVendorName) ||
      matchesVendorId(vendor, challan.outwardChallanVendorId)
    );
  }

  return false;
}

function buildAssociation(
  module: RecordModuleKey,
  displayModule: string,
  label: string,
  items: Array<{ id: string; label: string }>
): VendorAssociationGroup {
  return {
    module: displayModule,
    count: items.length,
    label,
    records: items.slice(0, 3).map((item) => ({
      id: item.id,
      label: item.label,
      href: buildRecordHref(module, item.id, item.label),
    })),
  };
}

function collectAssociationItems<T>(
  items: T[],
  getItem: (item: T) => { id: string; label: string } | null
): Array<{ id: string; label: string }> {
  const collected: Array<{ id: string; label: string }> = [];
  for (const item of items) {
    const mapped = getItem(item);
    if (mapped) collected.push(mapped);
  }
  return collected;
}

/** Split parents are archived after pieces are created — they should not block vendor delete. */
export function isActiveStockInwardForVendorLink(entry: StockInward): boolean {
  return entry.status !== "split";
}

export function getVendorDeleteAssociations(
  vendor: Vendor,
  data: {
    stockInward?: StockInward[];
    purchaseOrders?: PurchaseOrder[];
    challans?: Challan[];
    powderCoating?: PowderCoating[];
  }
): VendorAssociationGroup[] {
  const stockInward = data.stockInward ?? [];
  const purchaseOrders = data.purchaseOrders ?? [];
  const challans = data.challans ?? [];
  const powderCoating = data.powderCoating ?? [];

  const associations: VendorAssociationGroup[] = [];

  const stockItems = collectAssociationItems(
    stockInward.filter(
      (entry) =>
        isActiveStockInwardForVendorLink(entry) &&
        matchesVendorName(vendor, entry.supplier)
    ),
    (entry) => ({
      id: entry.id,
      label: entry.inwardNo?.trim() || entry.id,
    })
  );
  if (stockItems.length > 0) {
    associations.push(
      buildAssociation("stock-inward", "Stock Inward", "stock inward record(s)", stockItems)
    );
  }

  const purchaseOrderItems = collectAssociationItems(
    purchaseOrders.filter((order) => matchesVendorName(vendor, order.vendorName)),
    (order) => ({
      id: order.id,
      label: order.poNumber?.trim() || order.id,
    })
  );
  if (purchaseOrderItems.length > 0) {
    associations.push(
      buildAssociation(
        "purchase-orders",
        "Purchase Orders",
        "purchase order(s)",
        purchaseOrderItems
      )
    );
  }

  const outwardChallans = challans.filter(
    (challan) => challan.type === "outward" && isChallanLinkedToVendor(challan, vendor)
  );
  const outwardItems = collectAssociationItems(outwardChallans, (challan) => ({
    id: challan.id,
    label: challan.challanNumber?.trim() || challan.id,
  }));
  if (outwardItems.length > 0) {
    associations.push(
      buildAssociation("challans-outward", "Outward Challans", "outward challan(s)", outwardItems)
    );
  }

  const coatingChallans = challans.filter(
    (challan) => challan.type === "powder_coating" && isChallanLinkedToVendor(challan, vendor)
  );
  const coatingChallanItems = collectAssociationItems(coatingChallans, (challan) => ({
    id: challan.id,
    label: challan.challanNumber?.trim() || challan.id,
  }));
  if (coatingChallanItems.length > 0) {
    associations.push(
      buildAssociation(
        "challans-powder-coating",
        "Powder Coating Challans",
        "powder coating challan(s)",
        coatingChallanItems
      )
    );
  }

  const returnChallans = challans.filter(
    (challan) => challan.type === "return" && isChallanLinkedToVendor(challan, vendor)
  );
  const returnItems = collectAssociationItems(returnChallans, (challan) => ({
    id: challan.id,
    label: challan.challanNumber?.trim() || challan.id,
  }));
  if (returnItems.length > 0) {
    associations.push(
      buildAssociation("challans-return", "Return Challans", "return challan(s)", returnItems)
    );
  }

  const coatingBatchItems = collectAssociationItems(
    powderCoating.filter((entry) => matchesVendorName(vendor, entry.vendor)),
    (entry) => ({
      id: entry.id,
      label: entry.batchNo?.trim() || entry.id,
    })
  );
  if (coatingBatchItems.length > 0) {
    associations.push(
      buildAssociation(
        "powder-coating",
        "Powder Coating",
        "powder coating batch(es)",
        coatingBatchItems
      )
    );
  }

  return associations;
}

export function formatVendorDeleteBlockMessage(
  vendorName: string,
  associations: VendorAssociationGroup[]
): string {
  const lines = [`Cannot delete ${vendorName} because it is used in:`];
  for (const item of associations) {
    let line = `• ${item.count} ${item.label}`;
    if (item.records.length > 0) {
      line += `: ${item.records.map((record) => record.label).join(", ")}`;
    }
    lines.push(line);
  }
  lines.push("");
  lines.push("Delete those records first, then try again.");
  return lines.join("\n");
}
