import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Challan, OutwardChallan, PowderCoatingChallan, Profile, Vendor } from "@/types";
import { BRAND } from "./brand";
import { COMPANY, DELIVERY_CHALLAN } from "./company";
import { getOutwardChallanProjectName, sumChallanItemQuantities } from "./challan-outward";
import {
  getOutwardChallanPdfBranding,
  resolveOutwardChallanPdfBranding,
  resolveOutwardDeliveryChallanPdfBranding,
} from "./outward-challan-branding";
import {
  calculatePowderCoatingItemAmount,
  findProfileByCode,
  getPowderCoatingItemRate,
  getProfileDesignImage,
  POWDER_COATING_FEET_RATE_LABEL,
} from "./profile";
import { findVendorByPartyName } from "./vendor";
import { formatGstNo, formatPdfDate, metersToFeet } from "./utils";

const C = {
  primary: [...BRAND.primaryRgb] as [number, number, number],
  ink: [20, 24, 33] as [number, number, number],
  inkSoft: [70, 78, 96] as [number, number, number],
  line: [0, 0, 0] as [number, number, number],
  headFill: [238, 240, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  outwardHighlight: [255, 255, 153] as [number, number, number],
} as const;

function formatPdfDecimal(value: number, maxDecimals = 4): string {
  if (!value) return "";
  const fixed = value.toFixed(maxDecimals);
  return fixed.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function formatPdfCurrency(value: number): string {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWeightKg(value: number): string {
  if (!value) return "";
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text}KG`;
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

function getChallanDocTitle(type: Challan["type"]): string {
  if (type === "powder_coating") return "POWDER COATING CHALLAN";
  return "DELIVERY CHALLAN";
}

function getChallanNumberMetaLabel(type: Challan["type"]): string {
  if (type === "powder_coating") return "P.C. No";
  return "O.C. No";
}

function buildMetaRows(challan: Challan): ReadonlyArray<readonly [string, string]> {
  const rows: Array<[string, string]> = [
    [getChallanNumberMetaLabel(challan.type), challan.challanNumber?.trim() || ""],
    ["Date", formatPdfDate(challan.date)],
    ["V. Number", challan.vehicleNumber?.trim() || ""],
  ];

  if (challan.type === "outward") {
    const outward = challan as OutwardChallan;
    const projectName = getOutwardChallanProjectName(outward);
    if (projectName) rows.push(["Project Name", projectName]);
  }

  if (challan.type === "powder_coating") {
    const coating = challan as PowderCoatingChallan;
    rows.push(["Color", coating.color?.trim() || ""]);
    if (coating.sourceOutwardChallanNumber?.trim()) {
      rows.push(["Outward Challan", coating.sourceOutwardChallanNumber.trim()]);
    }
    const projectName = getOutwardChallanProjectName(coating);
    if (projectName) rows.push(["Project Name", projectName]);
  }

  return rows;
}

function drawCenteredTextInBox(
  doc: jsPDF,
  text: string,
  box: { x: number; y: number; width: number; height: number },
  options: { fontSize?: number; padding?: number } = {}
): void {
  const fontSize = options.fontSize ?? 7;
  const padding = options.padding ?? 1.5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(...C.ink);

  const wrapped = doc.splitTextToSize(text, Math.max(8, box.width - padding * 2));
  const lines = Array.isArray(wrapped) ? wrapped : [wrapped];
  const sampleHeight = doc.getTextDimensions(lines[0] || "X").h;
  const lineHeight = sampleHeight * 1.12;
  const blockHeight = lines.length * lineHeight;
  const startY = box.y + (box.height - blockHeight) / 2 + sampleHeight * 0.85;
  const centerX = box.x + box.width / 2;

  lines.forEach((line, index) => {
    doc.text(line, centerX, startY + index * lineHeight, { align: "center" });
  });
}

function drawChallanSignatureFooter(
  doc: jsPDF,
  options: {
    left: number;
    y: number;
    width: number;
    totalAmount: number | null;
    totalNoOfProfiles?: number | null;
    gstNo?: string;
    footerLeftLines?: string[];
    signatoryLine: string;
    drawLine: (x1: number, y1: number, x2: number, y2: number, lw?: number) => void;
    cellText: (
      text: string | string[],
      x: number,
      y: number,
      opts?: {
        size?: number;
        bold?: boolean;
        align?: "left" | "center" | "right";
        color?: readonly [number, number, number];
      }
    ) => void;
  }
): number {
  const {
    left,
    y,
    width,
    totalAmount,
    totalNoOfProfiles,
    gstNo,
    footerLeftLines,
    signatoryLine,
    drawLine,
    cellText,
  } = options;
  const right = left + width;
  const topRowH =
    footerLeftLines && footerLeftLines.length > 1 && footerLeftLines.length !== 2 ? 10 : 8;
  const middleRowH = 14;
  const bottomRowH = 8;
  const footerH = topRowH + middleRowH + bottomRowH;
  const leftW = width * 0.68;
  const rightW = width - leftW;
  const totalLabelW = rightW * 0.42;
  const profilesLabelW = rightW * 0.58;
  const rightX = left + leftW;
  const row2Y = y + topRowH;
  const row3Y = y + topRowH + middleRowH;
  const isOutwardBundlesWeightRow =
    footerLeftLines?.length === 2 && totalAmount == null;

  if (isOutwardBundlesWeightRow) {
    const halfLeftW = leftW / 2;
    doc.setFillColor(...C.outwardHighlight);
    doc.rect(left, y, halfLeftW, topRowH, "F");
    doc.rect(left + halfLeftW, y, halfLeftW, topRowH, "F");
    doc.setFillColor(...C.headFill);
    doc.rect(rightX, y, rightW, topRowH, "F");
  } else {
    doc.setFillColor(...C.headFill);
    doc.rect(left, y, width, topRowH, "F");
  }

  if (footerLeftLines?.length) {
    if (footerLeftLines.length === 2) {
      const halfLeftW = leftW / 2;
      cellText(footerLeftLines[0], left + halfLeftW / 2, y + 5.2, {
        bold: true,
        size: 7.5,
        align: "center",
      });
      cellText(footerLeftLines[1], left + halfLeftW + halfLeftW / 2, y + 5.2, {
        bold: true,
        size: 7.5,
        align: "center",
      });
    } else {
      footerLeftLines.forEach((line, index) => {
        cellText(line, left + 2, y + 3.8 + index * 3.6, { bold: true, size: 7.5 });
      });
    }
  } else if (gstNo) {
    cellText(`GST NO: ${formatGstNo(gstNo)}`, left + 2, y + 5.2, { bold: true, size: 8 });
  }

  if (totalAmount != null) {
    cellText("TOTAL", rightX + totalLabelW / 2, y + 5.2, { bold: true, size: 8, align: "center" });
    cellText(formatPdfCurrency(totalAmount), right - 2, y + 5.2, {
      bold: true,
      size: 8,
      align: "right",
    });
  } else if (totalNoOfProfiles != null && totalNoOfProfiles > 0) {
    drawCenteredTextInBox(doc, "TOTAL NO. OF PROFILES", {
      x: rightX,
      y,
      width: profilesLabelW,
      height: topRowH,
    });
    cellText(String(totalNoOfProfiles), right - 2, y + 5.2, {
      bold: true,
      size: 8,
      align: "right",
    });
  }

  doc.setFillColor(...C.white);
  doc.rect(left, row2Y, width, middleRowH + bottomRowH, "F");
  cellText("Receiver Sign , With Rubber Stamp", left + 2, row3Y + 4.5, { bold: true, size: 7.5 });
  cellText(
    doc.splitTextToSize(signatoryLine, rightW - 4),
    rightX + rightW / 2,
    row2Y + 6,
    { bold: true, size: 7.5, align: "center" }
  );
  cellText("Authorise Signature", rightX + rightW / 2, row3Y + bottomRowH - 2, {
    bold: true,
    size: 7.5,
    align: "center",
  });

  drawLine(left, y, right, y);
  drawLine(left, y + footerH, right, y + footerH);
  drawLine(left, y, left, y + footerH);
  drawLine(right, y, right, y + footerH);
  drawLine(rightX, y, rightX, y + footerH);
  drawLine(left, row2Y, right, row2Y);
  drawLine(left, row3Y, left + leftW, row3Y);
  drawLine(rightX, row3Y, right, row3Y);
  if (isOutwardBundlesWeightRow) {
    drawLine(left + leftW / 2, y, left + leftW / 2, y + topRowH);
  }
  if (totalAmount != null) {
    drawLine(rightX + totalLabelW, y, rightX + totalLabelW, row2Y);
  } else if (totalNoOfProfiles != null && totalNoOfProfiles > 0) {
    drawLine(rightX + profilesLabelW, y, rightX + profilesLabelW, row2Y);
  }

  return y + footerH;
}

export async function generateChallanDocumentPDF(
  challan: Challan,
  profiles: Profile[],
  vendors: Vendor[] = []
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const left = margin;
  const right = margin + contentWidth;

  const drawLine = (x1: number, y1: number, x2: number, y2: number, lw = 0.3) => {
    doc.setDrawColor(...C.line);
    doc.setLineWidth(lw);
    doc.line(x1, y1, x2, y2);
  };
  const cellText = (
    text: string | string[],
    x: number,
    yPos: number,
    opts: {
      size?: number;
      bold?: boolean;
      align?: "left" | "center" | "right";
      color?: readonly [number, number, number];
    } = {}
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 8);
    doc.setTextColor(...(opts.color ?? C.ink));
    doc.text(text, x, yPos, { align: opts.align ?? "left" });
  };

  const partyGstNo = formatGstNo(
    challan.vendorGstNo ||
      findVendorByPartyName(vendors, challan.vendorName)?.gstNo ||
      ""
  );

  const pdfBranding =
    challan.type === "powder_coating"
      ? resolveOutwardChallanPdfBranding(challan, vendors)
      : challan.type === "outward"
        ? resolveOutwardDeliveryChallanPdfBranding(challan, vendors)
        : getOutwardChallanPdfBranding(undefined);

  const addressLine = pdfBranding.addressLine2
    ? `${pdfBranding.addressLine1}, ${pdfBranding.addressLine2}`
    : pdfBranding.addressLine1;

  let y = margin;

  // ---- Header: logo + title + company + address ----
  const logoW = 26;
  const titleH = 6;
  const companyNameFontSize = 18;
  const nameH = 10;
  const addrFontSize = 9;
  const rightX = left + logoW;
  const rightW = contentWidth - logoW;
  const addrLines = doc.splitTextToSize(addressLine, rightW - 4);
  const addrH = Math.max(7, addrLines.length * 4.2 + 2);
  const headerBlockH = titleH + nameH + addrH;

  const logoData = await resolveImageDataUrl(pdfBranding.logoUrl ?? COMPANY.logo);
  if (logoData) {
    try {
      const dims = (await getImageDimensions(logoData)) ?? { width: 1024, height: 596 };
      const fitted = fitImageBox(dims.width, dims.height, logoW - 5, headerBlockH - 5);
      doc.addImage(
        logoData,
        imageFormat(logoData),
        left + (logoW - fitted.width) / 2,
        y + (headerBlockH - fitted.height) / 2,
        fitted.width,
        fitted.height
      );
    } catch {
      cellText("MAGS", left + logoW / 2, y + headerBlockH / 2, {
        bold: true,
        align: "center",
        color: C.primary,
        size: 10,
      });
    }
  } else {
    cellText("MAGS", left + logoW / 2, y + headerBlockH / 2, {
      bold: true,
      align: "center",
      color: C.primary,
      size: 10,
    });
  }

  cellText(getChallanDocTitle(challan.type), rightX + rightW / 2, y + 4.2, {
    bold: true,
    size: 8.5,
    align: "center",
  });
  cellText(pdfBranding.companyName, rightX + rightW / 2, y + titleH + 6.5, {
    bold: true,
    size: companyNameFontSize,
    align: "center",
  });
  cellText(addrLines, rightX + rightW / 2, y + titleH + nameH + 4, {
    size: addrFontSize,
    align: "center",
    color: C.inkSoft,
  });

  drawLine(left, y, right, y);
  drawLine(left, y + headerBlockH, right, y + headerBlockH);
  drawLine(left, y, left, y + headerBlockH);
  drawLine(right, y, right, y + headerBlockH);
  drawLine(rightX, y, rightX, y + headerBlockH);
  drawLine(rightX, y + titleH, right, y + titleH);

  y += headerBlockH;

  // ---- Email | Phone | (GST for outward) row ----
  const contactH = 6;
  const isOutwardChallan = challan.type === "outward";

  if (isOutwardChallan) {
    const thirdW = contentWidth / 3;
    const emailCenter = left + thirdW / 2;
    const phoneCenter = left + thirdW + thirdW / 2;
    const gstCenter = left + 2 * thirdW + thirdW / 2;
    const gstNo = formatGstNo(pdfBranding.gstNo) || "-";

    cellText(`Email: ${pdfBranding.email || "-"}`, emailCenter, y + 4, {
      size: 7,
      align: "center",
    });
    cellText(pdfBranding.phone || "-", phoneCenter, y + 4, {
      size: 7,
      align: "center",
    });
    cellText(`GST No.: ${gstNo}`, gstCenter, y + 4, {
      size: 7,
      align: "center",
    });

    drawLine(left, y, left, y + contactH);
    drawLine(right, y, right, y + contactH);
    drawLine(left + thirdW, y, left + thirdW, y + contactH);
    drawLine(left + 2 * thirdW, y, left + 2 * thirdW, y + contactH);
    drawLine(left, y + contactH, right, y + contactH);
  } else {
    const midX = left + contentWidth / 2;
    const leftContactCenter = left + contentWidth / 4;
    const rightContactCenter = left + (3 * contentWidth) / 4;
    cellText(`Email: ${pdfBranding.email}`, leftContactCenter, y + 4, {
      size: 7.5,
      align: "center",
    });
    cellText(pdfBranding.phone, rightContactCenter, y + 4, {
      size: 7.5,
      align: "center",
    });
    drawLine(left, y, left, y + contactH);
    drawLine(right, y, right, y + contactH);
    drawLine(midX, y, midX, y + contactH);
    drawLine(left, y + contactH, right, y + contactH);
  }
  y += contactH;

  // ---- Party / meta block ----
  const partyLeftW = contentWidth * 0.62;
  const metaX = left + partyLeftW;
  const metaLabelW = 24;
  const partyLabelW = 22;
  const rowH = 6;
  const partyName = challan.vendorName?.trim() || "";
  const addressValue = challan.vendorAddress?.trim() || "";
  const addressLines = doc.splitTextToSize(addressValue, partyLeftW - partyLabelW - 4);
  const addressH = Math.max(rowH * 2, addressLines.length * 3.6 + 4);
  const afterAddressRows = [
    ["Person Name", challan.vendorPersonName?.trim() || ""],
    ["Contact No.", challan.vendorContact?.trim() || ""],
    ["GST No.", partyGstNo],
  ] as const;
  const leftBlockH = rowH + addressH + rowH * afterAddressRows.length;
  const metaRows = buildMetaRows(challan);
  const metaBlockH = Math.max(leftBlockH, rowH * metaRows.length);

  cellText("Party Name", left + 1.5, y + 4, { bold: true, size: 6.8, color: C.inkSoft });
  cellText(partyName, left + partyLabelW, y + 4, { bold: true, size: 8 });

  const addressY = y + rowH;
  cellText("Address", left + 1.5, addressY + 4, { bold: true, size: 6.8, color: C.inkSoft });
  cellText(addressLines, left + partyLabelW, addressY + 4, { size: 7.5 });

  const afterAddressY = addressY + addressH;
  afterAddressRows.forEach(([label, value], i) => {
    cellText(label, left + 1.5, afterAddressY + i * rowH + 4, {
      bold: true,
      size: 6.8,
      color: C.inkSoft,
    });
    cellText(value, left + partyLabelW, afterAddressY + i * rowH + 4, { bold: true, size: 8 });
  });

  const metaRowH = metaBlockH / metaRows.length;
  metaRows.forEach(([label, value], i) => {
    const ry = y + i * metaRowH;
    cellText(label, metaX + 1.5, ry + metaRowH / 2 + 1, {
      bold: true,
      size: 6.8,
      color: C.inkSoft,
    });
    const valueLines = doc.splitTextToSize(value || "-", right - metaX - metaLabelW - 2);
    cellText(valueLines, metaX + metaLabelW, ry + metaRowH / 2 + 1, { bold: true, size: 8 });
    if (i > 0) drawLine(metaX, ry, right, ry);
    drawLine(metaX + metaLabelW - 2, ry, metaX + metaLabelW - 2, ry + metaRowH);
  });

  drawLine(left, y, right, y);
  drawLine(left, y + metaBlockH, right, y + metaBlockH);
  drawLine(left, y, left, y + metaBlockH);
  drawLine(right, y, right, y + metaBlockH);
  drawLine(metaX, y, metaX, y + metaBlockH);
  drawLine(left + partyLabelW - 2, y, left + partyLabelW - 2, y + metaBlockH);
  drawLine(left, y + rowH, metaX, y + rowH);
  drawLine(left, afterAddressY, metaX, afterAddressY);
  for (let i = 1; i < afterAddressRows.length; i += 1) {
    drawLine(left, afterAddressY + i * rowH, metaX, afterAddressY + i * rowH);
  }

  y += metaBlockH;

  // ---- Items table ----
  const items = challan.items ?? [];
  const isOutward = challan.type === "outward";
  const isPowderCoating = challan.type === "powder_coating";
  const coatingColor = isPowderCoating ? (challan as PowderCoatingChallan).color?.trim() || "-" : "";
  const coatingFormulaRate = isPowderCoating
    ? (challan as PowderCoatingChallan).coatingRate
    : undefined;

  const imageCache = new Map<
    string,
    { dataUrl: string; width: number; height: number } | null
  >();
  await Promise.all(
    items.map(async (item) => {
      const src =
        item.profileImage?.trim() ||
        getProfileDesignImage(findProfileByCode(profiles, item.profileCode) ?? ({} as Profile));
      if (!src || imageCache.has(src)) return;
      const dataUrl = await resolveImageDataUrl(src);
      if (!dataUrl) {
        imageCache.set(src, null);
        return;
      }
      const dims = (await getImageDimensions(dataUrl)) ?? { width: 1, height: 1 };
      imageCache.set(src, { dataUrl, width: dims.width, height: dims.height });
    })
  );

  const resolveItemImage = (item: Challan["items"][number]): string => {
    const direct = item.profileImage?.trim();
    if (direct) return direct;
    const profile = findProfileByCode(profiles, item.profileCode);
    return profile ? getProfileDesignImage(profile) : "";
  };

  const headLabels = isOutward
    ? ["SR.NO", "PROFILE CODE", "PROFILE", "ITEM DESCRIPTION", "UOM", "LENGTH (M)", "QTY"]
    : isPowderCoating
      ? [
          "SR.NO",
          "PROFILE CODE",
          "PROFILE",
          "ITEM DESCRIPTION",
          "COLOR",
          "UOM",
          "LENGTH (M)",
          "LENGTH (FT)",
          POWDER_COATING_FEET_RATE_LABEL.toUpperCase(),
          "QTY",
          "AMOUNT",
        ]
      : [
          "SR.NO",
          "PROFILE CODE",
          "PROFILE",
          "ITEM DESCRIPTION",
          "UOM",
          "LENGTH (M)",
          "QTY",
          "AMOUNT",
        ];

  const baseColWidths = isOutward
    ? [14, 24, 20, 72, 14, 18, 14]
    : isPowderCoating
      ? [12, 20, 18, 30, 14, 11, 13, 13, 14, 11, 16]
      : [12, 20, 18, 44, 12, 18, 14, 18];

  const baseSum = baseColWidths.reduce((sum, w) => sum + w, 0);
  const scale = contentWidth / baseSum;
  const scaled = baseColWidths.map((w) => w * scale);
  scaled[scaled.length - 1] += contentWidth - scaled.reduce((sum, w) => sum + w, 0);
  const imageColIndex = 2;
  const columnStyles: Record<number, object> = {};
  scaled.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w, halign: "center" as const };
  });
  if (!isOutward) {
    columnStyles[3] = { cellWidth: scaled[3], halign: "left" as const };
  } else {
    columnStyles[3] = { cellWidth: scaled[3], halign: "left" as const };
  }
  columnStyles[imageColIndex] = {
    ...(columnStyles[imageColIndex] as object),
    minCellHeight: 28,
  };

  const body = items.map((item, index) => {
    const profile = findProfileByCode(profiles, item.profileCode);
    const length = Number(item.length) || 0;
    const qty = Number(item.qty) || 0;
    const description = item.profileName ?? profile?.name ?? "-";

    if (isOutward) {
      return [
        String(index + 1),
        item.profileCode ?? "-",
        "",
        description,
        "MTR",
        formatPdfDecimal(length, 2),
        qty ? String(qty) : "",
      ];
    }

    const feetRate = getPowderCoatingItemRate(item, profile, coatingFormulaRate);
    const amount = calculatePowderCoatingItemAmount(item, profile, coatingFormulaRate);
    const lengthFeet = length > 0 ? metersToFeet(length) : 0;
    const row = [
      String(index + 1),
      item.profileCode ?? "-",
      "",
      description,
    ];
    if (isPowderCoating) row.push(coatingColor);
    row.push(
      "MTR",
      formatPdfDecimal(length, 2),
      lengthFeet > 0 ? formatPdfDecimal(lengthFeet, 2) : "",
      formatPdfDecimal(feetRate),
      qty ? String(qty) : "",
      formatPdfDecimal(amount)
    );
    return row;
  });

  const totalAmount = isOutward
    ? null
    : Math.round(
        items.reduce((sum, item) => {
          const profile = findProfileByCode(profiles, item.profileCode);
          return sum + calculatePowderCoatingItemAmount(item, profile, coatingFormulaRate);
        }, 0) * 100
      ) / 100;

  const outwardTotalProfiles = isOutward ? sumChallanItemQuantities(items) : null;
  const outwardFooterLeftLines = isOutward
    ? (() => {
        const outward = challan as OutwardChallan;
        const bundlesText =
          outward.totalBundles != null ? `Total Bundles: ${outward.totalBundles}` : "";
        const weightText =
          outward.totalWeightManual != null
            ? `Total Weight: ${formatWeightKg(outward.totalWeightManual) || "0KG"}`
            : "Total Weight: —";
        return bundlesText ? [bundlesText, weightText] : [weightText];
      })()
    : undefined;

  const tableOptions: Parameters<typeof autoTable>[1] = {
    startY: y,
    tableWidth: contentWidth,
    head: [headLabels],
    body,
    theme: "plain",
    rowPageBreak: "avoid",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      lineColor: C.line,
      lineWidth: 0.3,
      valign: "middle",
      minCellHeight: 8,
      textColor: C.ink,
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: C.headFill,
      textColor: C.ink,
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: 2.5,
      halign: "center",
      minCellHeight: 8,
      lineColor: C.line,
      lineWidth: 0.3,
    },
    columnStyles,
    margin: { left: margin, right: margin },
    didDrawCell: (data) => {
      if (data.section !== "body" || data.column.index !== imageColIndex) return;
      const item = items[data.row.index];
      if (!item) return;
      const src = resolveItemImage(item);
      const cached = src ? imageCache.get(src) : null;
      const pad = 2;
      const boxW = data.cell.width - pad * 2;
      const boxH = data.cell.height - pad * 2;
      if (cached) {
        try {
          const fitted = fitImageBox(cached.width, cached.height, boxW, boxH);
          const imageX = data.cell.x + pad + (boxW - fitted.width) / 2;
          const imageY = data.cell.y + pad + (boxH - fitted.height) / 2;
          doc.addImage(
            cached.dataUrl,
            imageFormat(cached.dataUrl),
            imageX,
            imageY,
            fitted.width,
            fitted.height,
            undefined,
            "FAST"
          );
          return;
        } catch {
          // fall through
        }
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(...C.inkSoft);
      doc.text("DRAWING", data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
        align: "center",
      });
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === imageColIndex) {
        data.cell.text = [""];
      }
    },
  };

  autoTable(doc, tableOptions);

  const tableEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 30;

  const footerGap = 4;
  const footerY = Math.min(tableEndY + footerGap, pageHeight - margin - 30);
  drawChallanSignatureFooter(doc, {
    left,
    y: footerY,
    width: contentWidth,
    totalAmount: isPowderCoating ? totalAmount : null,
    totalNoOfProfiles: outwardTotalProfiles,
    footerLeftLines: outwardFooterLeftLines,
    gstNo: isOutward ? undefined : pdfBranding.gstNo,
    signatoryLine: pdfBranding.signatoryLine,
    drawLine,
    cellText,
  });

  doc.save(`${challan.challanNumber?.replace(/[^a-zA-Z0-9._-]+/g, "-") || "delivery-challan"}.pdf`);
}

async function getImageDimensions(
  dataUrl: string
): Promise<{ width: number; height: number } | null> {
  if (typeof window === "undefined") return null;
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
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
