import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Profile, PurchaseOrder } from "@/types";
import { BRAND } from "./brand";
import { COMPANY, PURCHASE_ORDER } from "./company";
import { findProfileByCode, getProfileDesignImage } from "./profile";
import { getPurchaseOrderTotalWeight } from "./purchase-order-form";

const C = {
  primary: [...BRAND.primaryRgb] as [number, number, number],
  ink: [20, 24, 33] as [number, number, number],
  inkSoft: [70, 78, 96] as [number, number, number],
  line: [0, 0, 0] as [number, number, number],
  headFill: [238, 240, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
} as const;

function formatPoDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr || "-";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function formatWeight(value: number): string {
  if (!value) return "";
  const rounded = Math.round(value * 100) / 100;
  const text = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return `${text}KG`;
}

function formatLength(value: number): string {
  if (!value) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatKgPerMeter(value: number): string {
  if (!value) return "";
  return String(Math.round(value * 1000) / 1000);
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

export async function generatePurchaseOrderPDF(
  order: PurchaseOrder,
  profiles: Profile[]
): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
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
    text: string,
    x: number,
    y: number,
    opts: { size?: number; bold?: boolean; align?: "left" | "center" | "right"; color?: readonly [number, number, number] } = {}
  ) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size ?? 8);
    doc.setTextColor(...(opts.color ?? C.ink));
    doc.text(text, x, y, { align: opts.align ?? "left" });
  };

  let y = margin;

  // ---- Header: logo + title + company + address ----
  const logoW = 26;
  const titleH = 6;
  const nameH = 9;
  const addrH = 6;
  const headerBlockH = titleH + nameH + addrH;
  const rightX = left + logoW;
  const rightW = contentWidth - logoW;

  // Logo cell
  const logoData = await resolveImageDataUrl(COMPANY.logo);
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
      cellText("MAGS", left + logoW / 2, y + headerBlockH / 2, { bold: true, align: "center", color: C.primary, size: 10 });
    }
  } else {
    cellText("MAGS", left + logoW / 2, y + headerBlockH / 2, { bold: true, align: "center", color: C.primary, size: 10 });
  }

  cellText("PURCHASE ORDER", rightX + rightW / 2, y + 4.2, { bold: true, size: 8.5, align: "center" });
  cellText(PURCHASE_ORDER.companyName, rightX + rightW / 2, y + titleH + 6.2, {
    bold: true,
    size: 15,
    align: "center",
  });
  const addrLines = doc.splitTextToSize(PURCHASE_ORDER.addressLine, rightW - 4);
  cellText(addrLines[0] ?? "", rightX + rightW / 2, y + titleH + nameH + 4, {
    size: 7,
    align: "center",
    color: C.inkSoft,
  });

  // borders for header block
  drawLine(left, y, right, y);
  drawLine(left, y + headerBlockH, right, y + headerBlockH);
  drawLine(left, y, left, y + headerBlockH);
  drawLine(right, y, right, y + headerBlockH);
  drawLine(rightX, y, rightX, y + headerBlockH); // logo separator
  drawLine(rightX, y + titleH, right, y + titleH); // under title

  y += headerBlockH;

  // ---- Email | Web row (full width) ----
  const contactH = 6;
  const midX = left + contentWidth / 2;
  doc.setFillColor(...C.white);
  cellText(`Email: ${PURCHASE_ORDER.email}`, midX - 2, y + 4, { size: 7.5, align: "right" });
  cellText(`Web: ${PURCHASE_ORDER.website}`, midX + contentWidth / 2 - 2, y + 4, {
    size: 7.5,
    align: "right",
  });
  drawLine(left, y, left, y + contactH);
  drawLine(right, y, right, y + contactH);
  drawLine(left, y + contactH, right, y + contactH);
  y += contactH;

  // ---- Party / meta block ----
  const partyLeftW = contentWidth * 0.62;
  const metaX = left + partyLeftW;
  const metaLabelW = 22;
  const partyLabelW = 22;
  const rowH = 6;
  const partyRows = [
    ["Party Name", order.vendorName?.trim() || "-"],
  ] as const;
  const addressValue = order.vendorAddress?.trim() || "-";
  const addressLines = doc.splitTextToSize(addressValue, partyLeftW - partyLabelW - 4);
  const addressH = Math.max(rowH * 2, addressLines.length * 3.6 + 4);
  const metaBlockH = rowH + addressH;

  // left labels/values
  cellText("Party Name", left + 1.5, y + 4, { bold: true, size: 6.8, color: C.inkSoft });
  cellText(partyRows[0][1], left + partyLabelW, y + 4, { bold: true, size: 8 });
  cellText("Address", left + 1.5, y + rowH + 4, { bold: true, size: 6.8, color: C.inkSoft });
  cellText(addressLines, left + partyLabelW, y + rowH + 4, { size: 7.5 });

  // right meta rows
  const metaRows = [
    ["D.C. No", order.poNumber?.trim() || "-"],
    ["Date", formatPoDate(order.date)],
    ["V. Number", order.vehicleNumber?.trim() || ""],
  ] as const;
  const metaRowH = metaBlockH / 3;
  metaRows.forEach(([label, value], i) => {
    const ry = y + i * metaRowH;
    cellText(label, metaX + 1.5, ry + metaRowH / 2 + 1, { bold: true, size: 6.8, color: C.inkSoft });
    cellText(value, metaX + metaLabelW, ry + metaRowH / 2 + 1, { bold: true, size: 8 });
    if (i > 0) drawLine(metaX, ry, right, ry);
    drawLine(metaX + metaLabelW - 2, ry, metaX + metaLabelW - 2, ry + metaRowH);
  });

  // borders for meta block
  drawLine(left, y, right, y);
  drawLine(left, y + rowH, metaX, y + rowH); // between party name & address (left col only)
  drawLine(left, y + metaBlockH, right, y + metaBlockH);
  drawLine(left, y, left, y + metaBlockH);
  drawLine(right, y, right, y + metaBlockH);
  drawLine(metaX, y, metaX, y + metaBlockH);
  drawLine(left + partyLabelW - 2, y, left + partyLabelW - 2, y + metaBlockH);

  y += metaBlockH;

  // ---- Items table ----
  const items = order.items ?? [];
  const imageCache = new Map<string, string | null>();
  await Promise.all(
    items.map(async (item) => {
      const src = item.profileImage?.trim() || getProfileDesignImage(findProfileByCode(profiles, item.profileCode) ?? ({} as Profile));
      if (!src || imageCache.has(src)) return;
      imageCache.set(src, await resolveImageDataUrl(src));
    })
  );

  const resolveItemImage = (item: PurchaseOrder["items"][number]): string => {
    const direct = item.profileImage?.trim();
    if (direct) return direct;
    const profile = findProfileByCode(profiles, item.profileCode);
    return profile ? getProfileDesignImage(profile) : "";
  };

  const headLabels = [
    "SR.NO",
    "DIA DRAWING",
    "DIA CODE",
    "KG/MTR",
    "UOM",
    "LENGTH",
    "QTY",
    "TOTAL WEIGHT",
  ];
  const baseColWidths = [14, 78, 20, 18, 14, 18, 14, 28];
  const baseSum = baseColWidths.reduce((s, w) => s + w, 0);
  const scale = contentWidth / baseSum;
  const scaled = baseColWidths.map((w) => w * scale);
  scaled[scaled.length - 1] += contentWidth - scaled.reduce((s, w) => s + w, 0);
  const columnStyles: Record<number, object> = {};
  const aligns: ("left" | "center")[] = [
    "center",
    "center",
    "center",
    "center",
    "center",
    "center",
    "center",
    "center",
  ];
  scaled.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w, halign: aligns[i] };
  });
  const imageColIndex = 1;

  const body = items.map((item, index) => [
    String(index + 1),
    "",
    item.profileCode || "-",
    formatKgPerMeter(item.kgPerMeter),
    item.uom?.trim() || "MM",
    formatLength(item.length),
    item.qty ? String(item.qty) : "",
    formatWeight(item.totalWeightKg),
  ]);

  const totalWeight = getPurchaseOrderTotalWeight(order);

  autoTable(doc, {
    startY: y,
    tableWidth: contentWidth,
    head: [headLabels],
    body,
    foot: [
      [
        { content: "TOTAL", colSpan: 7, styles: { halign: "center", fontStyle: "bold" } },
        { content: formatWeight(totalWeight) || "0KG", styles: { halign: "center", fontStyle: "bold" } },
      ],
    ],
    theme: "plain",
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 2,
      lineColor: C.line,
      lineWidth: 0.3,
      valign: "middle",
      minCellHeight: 30,
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
    footStyles: {
      fillColor: C.white,
      textColor: C.ink,
      fontSize: 8.5,
      minCellHeight: 9,
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
      const imageData = src ? imageCache.get(src) : null;
      const pad = 2;
      const boxW = data.cell.width - pad * 2;
      const boxH = data.cell.height - pad * 2;
      if (imageData) {
        try {
          const x = data.cell.x + pad;
          const cy = data.cell.y + pad;
          doc.addImage(imageData, imageFormat(imageData), x, cy, boxW, boxH, undefined, "FAST");
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
  });

  doc.save(`${order.poNumber?.replace(/[^a-zA-Z0-9._-]+/g, "-") || "purchase-order"}.pdf`);
}
