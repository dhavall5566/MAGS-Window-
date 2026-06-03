import { NextRequest, NextResponse } from "next/server";
import { read } from "@/lib/mock-store";
import { getProfileById } from "@/lib/data-access";
import { requireAuth } from "@/lib/api-auth";

function inDateRange(date: string, from?: string | null, to?: string | null) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type") ?? "current-stock";
  const profileId = req.nextUrl.searchParams.get("profileId");
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const color = req.nextUrl.searchParams.get("color");
  const status = req.nextUrl.searchParams.get("status");

  return read((d) => {
    switch (type) {
      case "current-stock": {
        const data = d.profiles
          .filter((p) => p.status === "ACTIVE" && (!profileId || p.id === profileId))
          .sort((a, b) => a.profileCode.localeCompare(b.profileCode));
        return NextResponse.json(
          data.map((p) => ({
            Profile: p.profileCode,
            Name: p.profileName,
            Series: p.seriesName,
            "Raw Stock (KG)": p.currentStock,
            "Coated Stock (KG)": p.powderCoatedStock,
            Threshold: p.lowStockThreshold,
            "KG/MTR": p.weightPerMeter,
          }))
        );
      }
      case "consumption": {
        const data = d.consumptions
          .filter(
            (c) =>
              (!profileId || c.profileId === profileId) &&
              inDateRange(c.date, from, to)
          )
          .sort((a, b) => b.date.localeCompare(a.date));
        return NextResponse.json(
          data.map((c) => {
            const p = getProfileById(d, c.profileId)!;
            return {
              Date: c.date,
              Profile: p.profileCode,
              Name: p.profileName,
              Quantity: c.quantity,
              Unit: c.unit,
              "Weight (KG)": c.calculatedWeight,
              Remarks: c.remarks ?? "",
            };
          })
        );
      }
      case "powder-coating": {
        const data = d.powderCoatings
          .filter(
            (p) =>
              (!profileId || p.profileId === profileId) &&
              (!color || p.color === color) &&
              (!status || p.status === status) &&
              inDateRange(p.transferDate, from, to)
          )
          .sort((a, b) => b.transferDate.localeCompare(a.transferDate));
        return NextResponse.json(
          data.map((p) => {
            const prof = getProfileById(d, p.profileId)!;
            return {
              Date: p.transferDate,
              Profile: prof.profileCode,
              Name: prof.profileName,
              Quantity: p.quantity,
              "Weight (KG)": p.weight,
              Color: p.color,
              Status: p.status,
              Remarks: p.remarks ?? "",
            };
          })
        );
      }
      case "color-inventory": {
        const groups: Record<string, { color: string; status: string; weight: number; quantity: number }> = {};
        d.powderCoatings
          .filter((p) => inDateRange(p.transferDate, from, to))
          .forEach((p) => {
            const key = `${p.color}|${p.status}`;
            if (!groups[key]) {
              groups[key] = { color: p.color, status: p.status, weight: 0, quantity: 0 };
            }
            groups[key].weight += p.weight;
            groups[key].quantity += p.quantity;
          });
        return NextResponse.json(
          Object.values(groups).map((g) => ({
            Color: g.color,
            Status: g.status,
            "Total Weight (KG)": g.weight,
            Quantity: g.quantity,
          }))
        );
      }
      case "scrap": {
        const data = d.scrapWastes
          .filter(
            (s) =>
              (!profileId || s.profileId === profileId) &&
              inDateRange(s.date, from, to)
          )
          .sort((a, b) => b.date.localeCompare(a.date));
        return NextResponse.json(
          data.map((s) => {
            const p = getProfileById(d, s.profileId)!;
            return {
              Date: s.date,
              Profile: p.profileCode,
              Name: p.profileName,
              Quantity: s.quantity,
              Reason: s.reason,
              Remarks: s.remarks ?? "",
            };
          })
        );
      }
      case "stock-movement": {
        const data = d.stockLedgers
          .filter(
            (l) =>
              (!profileId || l.profileId === profileId) &&
              inDateRange(l.date, from, to)
          )
          .sort((a, b) => b.date.localeCompare(a.date));
        return NextResponse.json(
          data.map((l) => ({
            Date: l.date,
            Profile: getProfileById(d, l.profileId)!.profileCode,
            Type: l.transactionType,
            Quantity: l.quantity,
            Balance: l.balance,
            User: d.users.find((u) => u.id === l.userId)?.name ?? "",
            Remarks: l.remarks ?? "",
          }))
        );
      }
      case "low-stock": {
        const low = d.profiles.filter(
          (p) => p.status === "ACTIVE" && p.currentStock <= p.lowStockThreshold
        );
        return NextResponse.json(
          low.map((p) => ({
            Profile: p.profileCode,
            Name: p.profileName,
            "Current Stock": p.currentStock,
            Threshold: p.lowStockThreshold,
            Deficit: p.lowStockThreshold - p.currentStock,
          }))
        );
      }
      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  });
}
