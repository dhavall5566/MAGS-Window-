import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import { companyInfo } from "./company";
import {
  CHALLAN_STATUS_LABELS,
  CHALLAN_TYPE_LABELS,
  colorLabel,
} from "./challan-labels";
import type { ChallanStatus, ChallanType, PowderCoatingColor } from "@/lib/types";
import { formatDate } from "./utils";

export type ChallanPdfData = {
  id: string;
  challanNumber: string;
  type: ChallanType;
  status: ChallanStatus;
  issueDate: Date | string;
  expectedReturnDate?: Date | string | null;
  vehicleNo?: string | null;
  driverName?: string | null;
  remarks?: string | null;
  preparedBy?: string | null;
  approvedBy?: string | null;
  receivedBy?: string | null;
  totalWeight: number;
  totalQty: number;
  color?: PowderCoatingColor | null;
  verifiedToken: string;
  vendor?: {
    name: string;
    contactPerson?: string | null;
    phone?: string | null;
    address?: string | null;
    gstin?: string | null;
  } | null;
  project?: {
    projectCode: string;
    projectName: string;
    clientName?: string | null;
    siteAddress?: string | null;
  } | null;
  parentChallan?: { challanNumber: string } | null;
  items: {
    profile: {
      profileCode: string;
      profileName: string;
      seriesName: string;
      weightPerMeter: number;
      imageUrl?: string | null;
    };
    quantity: number;
    length?: number | null;
    weight: number;
    remarks?: string | null;
  }[];
};

const BRAND = { r: 79, g: 91, b: 133 };

export async function generateChallanPdf(
  challan: ChallanPdfData,
  baseUrl: string
): Promise<Buffer> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const verifyUrl = `${baseUrl}/challans/verify/${challan.verifiedToken}`;

  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b);
  doc.rect(0, 0, pageWidth, 32, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyInfo.name.toUpperCase(), 14, 14);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyInfo.tagline, 14, 20);
  doc.text(companyInfo.servicesTagline, 14, 25);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(CHALLAN_TYPE_LABELS[challan.type], pageWidth - 14, 14, {
    align: "right",
  });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`No: ${challan.challanNumber}`, pageWidth - 14, 20, {
    align: "right",
  });
  doc.text(`Date: ${formatDate(challan.issueDate)}`, pageWidth - 14, 25, {
    align: "right",
  });

  doc.setTextColor(30, 30, 30);
  let y = 40;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Status:", 14, y);
  doc.setFont("helvetica", "normal");
  doc.text(CHALLAN_STATUS_LABELS[challan.status], 32, y);

  if (challan.color) {
    doc.setFont("helvetica", "bold");
    doc.text("Color:", 80, y);
    doc.setFont("helvetica", "normal");
    doc.text(colorLabel(challan.color), 94, y);
  }
  y += 7;

  if (challan.vendor) {
    doc.setFont("helvetica", "bold");
    doc.text("Vendor / Party:", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.text(challan.vendor.name, 14, y);
    y += 4;
    if (challan.vendor.contactPerson) {
      doc.text(`Contact: ${challan.vendor.contactPerson}`, 14, y);
      y += 4;
    }
    if (challan.vendor.phone) {
      doc.text(`Phone: ${challan.vendor.phone}`, 14, y);
      y += 4;
    }
    if (challan.vendor.address) {
      const lines = doc.splitTextToSize(challan.vendor.address, 90);
      doc.text(lines, 14, y);
      y += lines.length * 4;
    }
    if (challan.vendor.gstin) {
      doc.text(`GSTIN: ${challan.vendor.gstin}`, 14, y);
      y += 4;
    }
    y += 2;
  }

  if (challan.project) {
    doc.setFont("helvetica", "bold");
    doc.text("Project:", 110, 40);
    doc.setFont("helvetica", "normal");
    doc.text(`${challan.project.projectCode} — ${challan.project.projectName}`, 110, 45);
    if (challan.project.clientName) {
      doc.text(`Client: ${challan.project.clientName}`, 110, 50);
    }
  }

  if (challan.parentChallan) {
    doc.setFont("helvetica", "bold");
    doc.text("Ref. Challan:", 110, y > 55 ? y : 55);
    doc.setFont("helvetica", "normal");
    doc.text(challan.parentChallan.challanNumber, 135, y > 55 ? y : 55);
    y = Math.max(y, 60);
  }

  if (challan.vehicleNo || challan.driverName) {
    y += 2;
    doc.setFont("helvetica", "bold");
    doc.text("Transport:", 14, y);
    doc.setFont("helvetica", "normal");
    const transport = [challan.vehicleNo, challan.driverName]
      .filter(Boolean)
      .join(" | ");
    doc.text(transport, 38, y);
    y += 6;
  }

  y += 4;

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Sr",
        "Profile Code",
        "Profile Name",
        "Series",
        "Qty",
        "Length (M)",
        "Weight (KG)",
      ],
    ],
    body: challan.items.map((item, i) => [
      String(i + 1),
      item.profile.profileCode,
      item.profile.profileName,
      item.profile.seriesName,
      String(item.quantity),
      item.length != null ? item.length.toFixed(2) : "—",
      item.weight.toFixed(2),
    ]),
    foot: [
      [
        "",
        "",
        "",
        "TOTAL",
        challan.totalQty.toFixed(0),
        "",
        challan.totalWeight.toFixed(2),
      ],
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: {
      fillColor: [BRAND.r, BRAND.g, BRAND.b],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: { fontStyle: "bold", fillColor: [223, 229, 245] },
    theme: "grid",
  });

  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable
    .finalY;

  if (challan.remarks) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Remarks:", 14, finalY + 8);
    doc.setFont("helvetica", "normal");
    doc.text(challan.remarks, 30, finalY + 8);
  }

  const sigY = finalY + 22;
  doc.setDrawColor(BRAND.r, BRAND.g, BRAND.b);
  doc.line(14, sigY + 12, 60, sigY + 12);
  doc.line(75, sigY + 12, 121, sigY + 12);
  doc.line(136, sigY + 12, 182, sigY + 12);

  doc.setFontSize(8);
  doc.text("Prepared By", 14, sigY + 16);
  doc.text(challan.preparedBy ?? "________________", 14, sigY + 8);
  doc.text("Approved By", 75, sigY + 16);
  doc.text(challan.approvedBy ?? "________________", 75, sigY + 8);
  doc.text("Received By", 136, sigY + 16);
  doc.text(challan.receivedBy ?? "________________", 136, sigY + 8);

  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 120, margin: 1 });
  doc.addImage(qrDataUrl, "PNG", pageWidth - 38, sigY - 4, 28, 28);
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text("Scan to verify", pageWidth - 24, sigY + 28, { align: "center" });

  doc.setFontSize(7);
  doc.text(companyInfo.address.full, 14, 285);
  doc.text(`${companyInfo.phone} | ${companyInfo.email}`, 14, 289);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

export function printChallanWindow(challanId: string) {
  window.open(`/api/challans/${challanId}/pdf?print=1`, "_blank");
}
