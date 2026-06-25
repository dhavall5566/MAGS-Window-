import { fetchJson, invalidateJsonCache } from "@/lib/fetch-json";
import type { PurchaseOrder } from "@/types";

const LIST_URL = "/api/purchase-orders";

function mergePurchaseOrders(api: PurchaseOrder[], store: PurchaseOrder[]): PurchaseOrder[] {
  const merged = [...api];
  for (const entry of store) {
    const existing = merged.find((item) => item.id === entry.id);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      merged.push(entry);
    }
  }
  return merged;
}

export async function fetchPurchaseOrders(
  storeOrders: PurchaseOrder[] = []
): Promise<PurchaseOrder[]> {
  const data = await fetchJson<{ purchaseOrders?: PurchaseOrder[] }>(
    LIST_URL,
    { purchaseOrders: [] },
    { force: true }
  );
  return mergePurchaseOrders(data.purchaseOrders ?? [], storeOrders);
}

export async function createPurchaseOrderApi(
  order: PurchaseOrder
): Promise<PurchaseOrder | null> {
  try {
    const res = await fetch(LIST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { purchaseOrder?: PurchaseOrder };
    return data.purchaseOrder ?? order;
  } catch {
    return null;
  }
}

export async function updatePurchaseOrderApi(
  order: PurchaseOrder
): Promise<PurchaseOrder | null> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(order.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    invalidateJsonCache(LIST_URL);
    if (!res.ok) return null;
    const data = (await res.json()) as { purchaseOrder?: PurchaseOrder };
    return data.purchaseOrder ?? order;
  } catch {
    return null;
  }
}

export async function deletePurchaseOrderApi(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${LIST_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    invalidateJsonCache(LIST_URL);
    return res.ok;
  } catch {
    return false;
  }
}
