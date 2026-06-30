import { buildRecordHref } from "@/lib/record-navigation";
import { pushEventNotification } from "@/lib/notifications-api";
import type { Challan, Report } from "@/types";

function challanModuleKey(
  type: Challan["type"]
): "challans-outward" | "challans-powder-coating" | "challans-return" {
  if (type === "powder_coating") return "challans-powder-coating";
  if (type === "return") return "challans-return";
  return "challans-outward";
}

export function notifyChallanSaved(challan: Challan): void {
  const label = challan.challanNumber?.trim() || "Challan";
  void pushEventNotification({
    title: "Challan saved",
    message: `${label} was saved successfully`,
    type: "success",
    category: "challan",
    href: buildRecordHref(challanModuleKey(challan.type), challan.id, label),
    entityId: challan.id,
  });
}

export function notifyReportGenerated(report: Report): void {
  const label = report.reportNo?.trim() || "Report";
  void pushEventNotification({
    title: "Report generated",
    message: `${label} is ready to view`,
    type: "success",
    category: "report",
    href: `/reports?record=${encodeURIComponent(report.id)}&q=${encodeURIComponent(label)}`,
    entityId: report.id,
  });
}

export function notifyStockInwardSaved(count: number): void {
  void pushEventNotification({
    title: count > 1 ? "Stock inward entries saved" : "Stock inward saved",
    message:
      count > 1
        ? `${count} stock inward entries were saved successfully`
        : "Stock inward entry was saved successfully",
    type: "success",
    category: "stock_inward",
    href: "/stock-inward",
  });
}

export function notifySyncFailure(message: string): void {
  void pushEventNotification({
    title: "Sync failed",
    message,
    type: "error",
    category: "sync",
  });
}
