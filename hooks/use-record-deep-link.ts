"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useRecordDeepLink<T extends { id: string }>(
  records: T[],
  onOpenRecord: (record: T) => void,
  onBeforeOpen?: (record: T) => void
): string {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handledRecordId = useRef<string | null>(null);
  const recordId = searchParams.get("record");
  const initialSearchQuery = searchParams.get("q") ?? "";

  useEffect(() => {
    if (!recordId) {
      handledRecordId.current = null;
      return;
    }
    if (handledRecordId.current === recordId) return;

    const record = records.find((entry) => entry.id === recordId);
    if (!record) return;

    handledRecordId.current = recordId;
    onBeforeOpen?.(record);
    onOpenRecord(record);

    const params = new URLSearchParams(searchParams.toString());
    params.delete("record");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [recordId, records, onOpenRecord, onBeforeOpen, pathname, router, searchParams]);

  return initialSearchQuery;
}
