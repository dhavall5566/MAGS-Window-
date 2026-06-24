import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Challan, Profile, Vendor } from "@/types";
import { BRAND } from "./brand";
import { COMPANY, DELIVERY_CHALLAN } from "./company";
import {
  calculateChallanItemAmount,
  findProfileByCode,
  getChallanItemRatePerMeter,
} from "./profile";
import { findVendorByPartyName } from "./vendor";

const C = {
  primary: [...BRAND.primaryRgb] as [number, number, number],
  tableHead: [82, 94, 136] as [number, number, number],
  secondary: [223, 229, 245] as [number, number, number],
  ink: [26, 31, 46] as [number, number, number],
  inkSoft: [75, 82, 99] as [number, number, number],
  inkMuted: [139, 146, 160] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
} as const;

function formatChallanDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr || "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

function formatPdfDecimal(value: number, maxDecimals = 4): string {
  if (!value) return "0";
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatPdfCurrency(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function strokeTopRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  lineWidth = 0.35
): void {
  const r = Math.min(radius, width / 2, height);
  const x2 = x + width;
  const y2 = y + height;
  const steps = 12;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);
  doc.line(x, y + r, x, y2);
  doc.line(x, y2, x2, y2);
  doc.line(x2, y + r, x2, y2);

  let prevX = x;
  let prevY = y + r;
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI + (Math.PI / 2) * (i / steps);
    const px = x + r + r * Math.cos(angle);
    const py = y + r + r * Math.sin(angle);
    doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  }

  doc.line(x + r, y, x2 - r, y);

  prevX = x2 - r;
  prevY = y;
  for (let i = 0; i <= steps; i++) {
    const angle = -Math.PI / 2 + (Math.PI / 2) * (i / steps);
    const px = x2 - r + r * Math.cos(angle);
    const py = y + r + r * Math.sin(angle);
    doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  }
}

function strokeBottomRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  lineWidth = 0.35
): void {
  const r = Math.min(radius, width / 2, height);
  const x2 = x + width;
  const y2 = y + height;
  const steps = 12;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(lineWidth);
  doc.line(x, y, x2, y);
  doc.line(x, y, x, y2 - r);
  doc.line(x2, y, x2, y2 - r);

  let prevX = x;
  let prevY = y2 - r;
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI - (Math.PI / 2) * (i / steps);
    const px = x + r + r * Math.cos(angle);
    const py = y2 - r + r * Math.sin(angle);
    doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  }

  doc.line(x + r, y2, x2 - r, y2);

  prevX = x2 - r;
  prevY = y2;
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI / 2 - (Math.PI / 2) * (i / steps);
    const px = x2 - r + r * Math.cos(angle);
    const py = y2 - r + r * Math.sin(angle);
    doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  }
}

function drawChallanSignatureFooter(
  doc: jsPDF,
  options: {
    x: number;
    y: number;
    width: number;
    totalAmount: number | null;
    gstNo: string;
  }
): number {
  const { x, y, width, totalAmount, gstNo } = options;
  const { height: footerH, topRowH, bottomRowH, cornerR } = CHALLAN_FOOTER_LAYOUT;
  const leftW = width * 0.68;
  const rightW = width - leftW;
  const middleRowH = footerH - topRowH - bottomRowH;
  const totalLabelW = rightW * 0.42;
  const cellPad = 3;
  const headerValueColor = [235, 238, 245] as const;
  const bottomY = y + footerH;

  const leftX = x;
  const rightX = x + leftW;
  const row2Y = y + topRowH;
  const row3Y = y + topRowH + middleRowH;

  doc.setFillColor(...C.primary);
  doc.rect(x, y, width, topRowH, "F");

  doc.setFillColor(...C.secondary);
  doc.rect(x, y + topRowH, width, footerH - topRowH - cornerR, "F");
  doc.roundedRect(x, bottomY - cornerR * 2, width, cornerR * 2, cornerR, cornerR, "F");

  const drawFooterGridLines = () => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.line(x, row2Y, x + width, row2Y);
    doc.line(leftX + leftW, y, leftX + leftW, bottomY);
    doc.line(leftX, row3Y, leftX + leftW, row3Y);
    doc.line(rightX, row3Y, x + width, row3Y);
    doc.line(rightX + totalLabelW, y, rightX + totalLabelW, row2Y);
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...headerValueColor);
  doc.text(`GST NO: ${gstNo}`, leftX + cellPad, y + 5.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...headerValueColor);
  doc.text("TOTAL", rightX + totalLabelW / 2, y + 5.4, { align: "center" });

  if (totalAmount != null) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...headerValueColor);
    doc.text(formatPdfCurrency(totalAmount), x + width - cellPad, y + 5.4, {
      align: "right",
    });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink);
  doc.text("Receiver Sign , With Rubber Stamp", leftX + cellPad, row3Y + 5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink);
  const signatoryLines = doc.splitTextToSize(
    DELIVERY_CHALLAN.signatoryLine,
    rightW - cellPad * 2
  );
  doc.text(signatoryLines, rightX + rightW / 2, row2Y + 5, {
    align: "center",
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ink);
  doc.text("Authorise Signature", rightX + rightW / 2, row3Y + bottomRowH - 2.2, {
    align: "center",
  });

  drawFooterGridLines();
  strokeBottomRoundedRect(doc, x, y, width, footerH, cornerR);

  return y + footerH;
}

function formatSrNum(index: number): string {
  return String(index + 1).padStart(2, "0");
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

async function resolveImageDataUrl(src: string): Promise<string | null> {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = src.startsWith("http") ? src : `${origin}${src}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    return blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

function imageFormat(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
    return "JPEG";
  }
  return "PNG";
}

async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function fitImageBox(
  srcWidth: number,
  srcHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const ratio = srcWidth / srcHeight;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width, height };
}

function getItemRate(
  item: Challan["items"][number],
  profile?: Profile | null
): number {
  return getChallanItemRatePerMeter(item, profile);
}

function usesDeliveryTableLayout(type: Challan["type"]): boolean {
  return type === "outward";
}

type TableColumnStyle = {
  halign: "left" | "center";
  fontStyle?: "bold" | "normal";
  textColor?: readonly [number, number, number];
};

function buildScaledColumnWidths(
  baseColWidths: number[],
  contentWidth: number
): { colWidths: Record<number, number>; scaledWidths: number[] } {
  const baseSum = baseColWidths.reduce((sum, w) => sum + w, 0);
  const scale = contentWidth / baseSum;
  const scaledWidths = baseColWidths.map((w) => w * scale);
  const widthDrift = contentWidth - scaledWidths.reduce((sum, w) => sum + w, 0);
  scaledWidths[scaledWidths.length - 1] += widthDrift;
  const colWidths = Object.fromEntries(scaledWidths.map((w, i) => [i, w])) as Record<
    number,
    number
  >;
  return { colWidths, scaledWidths };
}

function buildColumnStyles(
  colWidths: Record<number, number>,
  styles: TableColumnStyle[]
): Record<number, object> {
  return Object.fromEntries(
    styles.map((style, index) => [
      index,
      {
        halign: style.halign,
        cellWidth: colWidths[index],
        ...(style.fontStyle ? { fontStyle: style.fontStyle } : {}),
        ...(style.textColor ? { textColor: style.textColor } : {}),
      },
    ])
  );
}

/** Shared compact header layout for outward, powder coating, and return challans. */
const CHALLAN_HEADER_LAYOUT = {
  margin: 6,
  headerH: 38,
  headerPadTop: 5,
  logoBoxH: 18,
} as const;

const CHALLAN_FOOTER_LAYOUT = {
  height: 38,
  topRowH: 8,
  bottomRowH: 7,
  cornerR: 4,
} as const;

function getChallanDocTitle(type: Challan["type"]): string {
  if (type === "powder_coating") return "Powder Coating Challan";
  if (type === "outward") return "Delivery Challan";
  return "Return Challan";
}

function getChallanNumberMetaLabel(type: Challan["type"]): string {
  if (type === "powder_coating") return "P.C. NO.";
  if (type === "return") return "RET. NO.";
  return "O.C. NO.";
}

export async function generateChallanDocumentPDF(
  challan: Challan,
  profiles: Profile[],
  vendors: Vendor[] = []
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const { margin, headerH, headerPadTop, logoBoxH } = CHALLAN_HEADER_LAYOUT;
  const pad = 6;
  const contentWidth = pageWidth - margin * 2;
  const rightEdge = margin + contentWidth - pad;
  const brandWidth = contentWidth * 0.52;
  const metaX = margin + brandWidth + 4;

  const logoData = await resolveImageDataUrl(COMPANY.logo);
  const projectName = challan.remarks?.trim() || "";
  const deliverTo = challan.vendorName?.trim() || "-";
  const partyName = challan.vendorPersonName?.trim() || "-";
  const partyAddress = challan.vendorAddress?.trim() || "-";
  const partyGstNo =
    challan.vendorGstNo?.trim() ||
    findVendorByPartyName(vendors, challan.vendorName)?.gstNo?.trim() ||
    "-";

  let y = margin;
  const headerY = y;

  doc.setFillColor(...C.white);
  doc.roundedRect(margin, y, contentWidth, pageHeight - margin * 2, 4, 4, "F");

  doc.setFillColor(...C.primary);
  doc.roundedRect(margin, y, contentWidth, headerH, 4, 4, "F");
  doc.rect(margin, y + headerH - 4, contentWidth, 4, "F");

  const logoX = margin + pad;
  const logoY = y + headerPadTop;
  const logoBoxW = 36;
  const logoInnerPad = 2;
  doc.setFillColor(...C.white);
  doc.roundedRect(logoX, logoY, logoBoxW, logoBoxH, 2, 2, "F");
  if (logoData) {
    try {
      const dims = (await getImageDimensions(logoData)) ?? {
        width: 1024,
        height: 596,
      };
      const fitted = fitImageBox(
        dims.width,
        dims.height,
        logoBoxW - logoInnerPad * 2,
        logoBoxH - logoInnerPad * 2
      );
      const imgX = logoX + (logoBoxW - fitted.width) / 2;
      const imgY = logoY + (logoBoxH - fitted.height) / 2;
      doc.addImage(logoData, imageFormat(logoData), imgX, imgY, fitted.width, fitted.height);
    } catch {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.primary);
      doc.text("MAGS", logoX + logoBoxW / 2, logoY + logoBoxH / 2 + 1, {
        align: "center",
      });
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.primary);
    doc.text("MAGS", logoX + logoBoxW / 2, logoY + logoBoxH / 2 + 1, {
      align: "center",
    });
  }

  const brandTextX = logoX + logoBoxW + 4;
  const brandMaxW = metaX - brandTextX - 2;
  let brandLineY = logoY + 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(200, 206, 220);
  doc.text(getChallanDocTitle(challan.type).toUpperCase(), brandTextX, brandLineY);
  brandLineY += 5;

  doc.setFontSize(12);
  doc.setTextColor(...C.white);
  const brandNameLines = doc.splitTextToSize(DELIVERY_CHALLAN.name, brandMaxW);
  doc.text(brandNameLines, brandTextX, brandLineY);
  brandLineY += brandNameLines.length * 4.8 + 2;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 206, 220);
  const addressLine1 = doc.splitTextToSize(DELIVERY_CHALLAN.addressLine1, brandMaxW);
  doc.text(addressLine1, brandTextX, brandLineY);
  brandLineY += addressLine1.length * 3.8 + 1;

  const addressLine2 = doc.splitTextToSize(DELIVERY_CHALLAN.addressLine2, brandMaxW);
  doc.text(addressLine2, brandTextX, brandLineY);
  brandLineY += addressLine2.length * 3.8 + 1;

  const contactLine = doc.splitTextToSize(
    `${DELIVERY_CHALLAN.email} | ${DELIVERY_CHALLAN.website}`,
    brandMaxW
  );
  doc.text(contactLine, brandTextX, brandLineY);

  const metaY = y + headerPadTop;
  if (projectName) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    const badgeText = projectName.toUpperCase();
    const badgeW = doc.getTextWidth(badgeText) + 12;
    const badgeX = rightEdge - badgeW;
    doc.setFillColor(100, 110, 150);
    doc.roundedRect(badgeX, metaY, badgeW, 7, 3, 3, "F");
    doc.setTextColor(...C.white);
    doc.text(badgeText, badgeX + badgeW / 2, metaY + 4.8, { align: "center" });
  }

  const metaFields = [
    ["DATE", formatChallanDate(challan.date)],
    [getChallanNumberMetaLabel(challan.type), challan.challanNumber?.trim() || "-"],
    ["V. NUMBER", challan.vehicleNumber?.trim() || "-"],
  ] as const;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const labelColW = Math.max(
    ...metaFields.map(([label]) => doc.getTextWidth(label))
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const valueColW = Math.max(
    ...metaFields.map(([, value]) => doc.getTextWidth(value))
  );
  const metaGap = 5;
  const metaBlockW = labelColW + metaGap + valueColW;
  const metaBlockX = rightEdge - metaBlockW;

  let metaRowY = metaY + (projectName ? 10 : 2);
  for (const [label, value] of metaFields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(170, 178, 200);
    doc.text(label, metaBlockX, metaRowY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(235, 238, 245);
    doc.text(value, metaBlockX + labelColW + metaGap, metaRowY);
    metaRowY += 6;
  }

  strokeTopRoundedRect(doc, margin, headerY, contentWidth, headerH, 4);

  y += headerH;

  const partyGap = 4;
  const partyColCount = 4;
  const partyColW =
    (contentWidth - pad * 2 - partyGap * (partyColCount - 1)) / partyColCount;
  const partyTopPad = 5;
  const partyLineH = 3.2;
  const partyBottomPad = 2;

  const partyItems = [
    ["DELIVER TO", deliverTo],
    ["PARTY NAME", partyName],
    ["GST NO.", partyGstNo],
    ["ADDRESS", partyAddress],
  ] as const;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  let maxValueLines = 1;
  const partyValueLines = partyItems.map(([, value]) => {
    const lines = doc.splitTextToSize(value || "-", partyColW - 1);
    maxValueLines = Math.max(maxValueLines, lines.length);
    return lines;
  });
  const partyH = partyTopPad + 4 + 2 + maxValueLines * partyLineH + partyBottomPad;

  doc.setFillColor(...C.secondary);
  doc.rect(margin, y, contentWidth, partyH, "F");
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(margin, y, margin + contentWidth, y);
  doc.line(margin, y, margin, y + partyH);
  doc.line(margin + contentWidth, y, margin + contentWidth, y + partyH);
  doc.line(margin, y + partyH, margin + contentWidth, y + partyH);

  partyItems.forEach(([label, value], i) => {
    const px = margin + pad + i * (partyColW + partyGap);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.primary);
    doc.text(label, px, y + partyTopPad);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.ink);
    doc.text(partyValueLines[i], px, y + partyTopPad + 6);
  });

  y += partyH;

  const items = challan.items ?? [];
  const isDeliveryLayout = usesDeliveryTableLayout(challan.type);
  const isPowderCoating = challan.type === "powder_coating";
  const coatingColor = isPowderCoating ? challan.color?.trim() || "-" : "";
  const imageCache = new Map<string, string | null>();

  await Promise.all(
    items.map(async (item) => {
      const src = item.profileImage?.trim();
      if (!src || imageCache.has(src)) return;
      imageCache.set(src, await resolveImageDataUrl(src));
    })
  );

  const tableBody = items.map((item, index) => {
    const profile = findProfileByCode(profiles, item.profileCode);
    const length = Number(item.length) || 0;
    const qty = Number(item.qty) || 0;
    const description = item.profileName ?? profile?.name ?? "-";

    if (isDeliveryLayout) {
      return [
        formatSrNum(index),
        item.profileCode ?? "-",
        "",
        description,
        "MTR",
        formatPdfDecimal(length, 2),
        String(qty),
      ];
    }

    const rate = getItemRate(item, profile);
    const amount = calculateChallanItemAmount(item, profile);
    const row = [
      formatSrNum(index),
      item.profileCode ?? "-",
      "",
      description,
    ];
    if (isPowderCoating) {
      row.push(coatingColor);
    }
    row.push(
      "MTR",
      formatPdfDecimal(length, 2),
      formatPdfDecimal(rate),
      String(qty),
      formatPdfDecimal(amount)
    );
    return row;
  });

  const totalAmount = isDeliveryLayout
    ? 0
    : Math.round(
        items.reduce((sum, item) => {
          const profile = findProfileByCode(profiles, item.profileCode);
          return sum + calculateChallanItemAmount(item, profile);
        }, 0) * 100
      ) / 100;

  const headLabels = isDeliveryLayout
    ? ["#", "Profile Code", "Profile", "Item Description", "UOM", "Length (m)", "Qty"]
    : isPowderCoating
      ? [
          "#",
          "Profile Code",
          "Profile",
          "Item Description",
          "Color",
          "UOM",
          "Length (m)",
          "Rate",
          "Qty",
          "Amount",
        ]
      : [
          "#",
          "Profile Code",
          "Profile",
          "Item Description",
          "UOM",
          "Length (m)",
          "Rate",
          "Qty",
          "Amount",
        ];

  const baseColWidths = isDeliveryLayout
    ? [10, 22, 16, 87, 11, 17, 11]
    : isPowderCoating
      ? [10, 22, 16, 40, 18, 11, 17, 17, 11, 18]
      : [10, 22, 16, 52, 11, 17, 17, 11, 18];

  const { colWidths } = buildScaledColumnWidths(baseColWidths, contentWidth);

  const descriptionColIndex = 3;
  const profileImageColIndex = 2;
  const columnStyles = buildColumnStyles(colWidths, isDeliveryLayout
    ? [
        { halign: "center", textColor: C.inkMuted },
        { halign: "center", fontStyle: "bold", textColor: C.primary },
        { halign: "center" },
        { halign: "left", fontStyle: "bold" },
        { halign: "center", textColor: C.inkMuted },
        { halign: "center", textColor: C.inkSoft },
        { halign: "center", fontStyle: "bold", textColor: C.primary },
      ]
    : isPowderCoating
      ? [
          { halign: "center", textColor: C.inkMuted },
          { halign: "center", fontStyle: "bold", textColor: C.primary },
          { halign: "center" },
          { halign: "left", fontStyle: "bold" },
          { halign: "center", fontStyle: "bold", textColor: C.ink },
          { halign: "center", textColor: C.inkMuted },
          { halign: "center", textColor: C.inkSoft },
          { halign: "center", textColor: C.inkSoft },
          { halign: "center", fontStyle: "bold", textColor: C.primary },
          { halign: "center", fontStyle: "bold", textColor: C.primary },
        ]
      : [
        { halign: "center", textColor: C.inkMuted },
        { halign: "center", fontStyle: "bold", textColor: C.primary },
        { halign: "center" },
        { halign: "left", fontStyle: "bold" },
        { halign: "center", textColor: C.inkMuted },
        { halign: "center", textColor: C.inkSoft },
        { halign: "center", textColor: C.inkSoft },
        { halign: "center", fontStyle: "bold", textColor: C.primary },
        { halign: "center", fontStyle: "bold", textColor: C.primary },
      ]);

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth,
    head: [headLabels],
    body: tableBody,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
      valign: "middle",
      minCellHeight: 13,
      textColor: C.ink,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: C.tableHead,
      textColor: C.white,
      fontStyle: "bold",
      fontSize: 6.5,
      cellPadding: 3,
      halign: "center",
      lineColor: [0, 0, 0],
      lineWidth: 0.25,
    },
    columnStyles,
    margin: { left: margin, right: margin },
    willDrawCell: (data) => {
      data.cell.styles.lineColor = [0, 0, 0];
      data.cell.styles.lineWidth = 0.25;
    },
    didDrawCell: (data) => {
      if (data.section === "head") {
        doc.setFillColor(...C.tableHead);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(...C.white);
        const text = headLabels[data.column.index] ?? "";
        const align = data.column.index === descriptionColIndex ? ("left" as const) : ("center" as const);
        const textX =
          align === "left"
            ? data.cell.x + 2.5
            : data.cell.x + data.cell.width / 2;
        doc.text(text, textX, data.cell.y + data.cell.height / 2 + 1, {
          align,
        });
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.25);
        doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "S");
        return;
      }

      if (
        data.section !== "body" ||
        data.column.index !== profileImageColIndex
      ) {
        return;
      }

      const { x, y: cy, width, height } = data.cell;
      const imagePad = 1.5;
      doc.setFillColor(...C.secondary);
      doc.roundedRect(x + imagePad, cy + imagePad, width - imagePad * 2, height - imagePad * 2, 1, 1, "F");

      const item = items[data.row.index];
      const src = item?.profileImage?.trim();
      const imageData = src ? imageCache.get(src) : null;

      if (imageData) {
        try {
          doc.addImage(
            imageData,
            "PNG",
            x + imagePad + 0.5,
            cy + imagePad + 0.5,
            width - imagePad * 2 - 1,
            height - imagePad * 2 - 1,
            undefined,
            "FAST"
          );
          return;
        } catch {
          // fall through to placeholder
        }
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.primary);
      doc.text("IMG", x + width / 2, cy + height / 2 + 1, { align: "center" });
    },
    didParseCell: (data) => {
      if (data.section === "head") {
        data.cell.text = [""];
      }
      if (
        data.section === "body" &&
        data.column.index === profileImageColIndex
      ) {
        data.cell.text = [""];
      }
    },
  });

  const tableEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;

  const signatureFooterH = CHALLAN_FOOTER_LAYOUT.height;
  const footerGap = 4;
  const usesSignatureFooter = isPowderCoating || isDeliveryLayout;

  if (usesSignatureFooter) {
    const footerY = Math.max(
      tableEndY + footerGap,
      pageHeight - margin - signatureFooterH
    );
    drawChallanSignatureFooter(doc, {
      x: margin,
      y: footerY,
      width: contentWidth,
      totalAmount: isPowderCoating ? totalAmount : null,
      gstNo: DELIVERY_CHALLAN.gstNo,
    });
  } else {
    const totalBarH = 10;
    const totalBarY = tableEndY + 4;
    let sectionEndY = totalBarY + totalBarH;

    doc.setFillColor(...C.secondary);
    doc.rect(margin, totalBarY, contentWidth, totalBarH, "F");
    doc.setDrawColor(205, 211, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, totalBarY, margin + contentWidth, totalBarY);
    doc.line(margin, totalBarY + totalBarH, margin + contentWidth, totalBarY + totalBarH);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...C.primary);
    doc.text("TOTAL AMOUNT", margin + pad, totalBarY + 6.5);

    doc.setFontSize(9);
    doc.setTextColor(...C.ink);
    doc.text(`Rs. ${formatPdfDecimal(totalAmount, 2)}`, rightEdge - pad, totalBarY + 6.5, {
      align: "right",
    });

    const footerH = 14;
    const footerTop = Math.max(sectionEndY + 8, pageHeight - margin - footerH);

    doc.setFillColor(...C.secondary);
    doc.rect(margin, footerTop, contentWidth, footerH, "F");
    doc.setDrawColor(205, 211, 232);
    doc.setLineWidth(0.2);
    doc.line(margin, footerTop, margin + contentWidth, footerTop);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.primary);
    doc.text(
      doc.splitTextToSize(
        `All amounts are in INR (Rs.) | ${DELIVERY_CHALLAN.email} | ${DELIVERY_CHALLAN.website}`,
        contentWidth * 0.62
      ),
      margin + pad,
      footerTop + 9
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(160, 168, 190);
    doc.text("COMPUTER GENERATED DOCUMENT", rightEdge, footerTop + 9, {
      align: "right",
    });
  }

  doc.save(`${challan.challanNumber ?? "delivery-challan"}.pdf`);
}
