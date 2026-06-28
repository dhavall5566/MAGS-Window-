"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GripVertical, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { VISIBLE_NAV_ORDER, getGroupLabel, getOrderedNavItems, isNavTabActive } from "@/lib/nav-items";
import { useAppStore } from "@/lib/store";
import { showSavedToast, runAfterToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function reorderList(order: string[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return order;
  const next = [...order];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function ordersMatch(a: string[], b: string[]) {
  return a.length === b.length && a.every((href, index) => href === b[index]);
}

function hiddenMatch(a: string[], b: string[]) {
  const left = [...a].sort();
  const right = [...b].sort();
  return left.length === right.length && left.every((href, index) => href === right[index]);
}

export function SidebarTabsEditor() {
  const navOrder = useAppStore((s) => s.navOrder);
  const hiddenNavHrefs = useAppStore((s) => s.hiddenNavHrefs);
  const setNavOrder = useAppStore((s) => s.setNavOrder);
  const setHiddenNavHrefs = useAppStore((s) => s.setHiddenNavHrefs);
  const resetNavOrder = useAppStore((s) => s.resetNavOrder);

  const savedOrder = useMemo(
    () => getOrderedNavItems(navOrder).map((item) => item.href),
    [navOrder]
  );
  const savedHidden = useMemo(() => hiddenNavHrefs ?? [], [hiddenNavHrefs]);

  const [draftOrder, setDraftOrder] = useState<string[]>(savedOrder);
  const [draftHiddenNavHrefs, setDraftHiddenNavHrefs] = useState<string[]>(savedHidden);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const listRef = useRef<HTMLUListElement>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const dropIndexRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftOrder(savedOrder);
    setDraftHiddenNavHrefs([...savedHidden]);
  }, [savedOrder, savedHidden]);

  const getIndexAtPointer = useCallback((clientY: number) => {
    const rows = listRef.current?.querySelectorAll<HTMLElement>("[data-tab-row]");
    if (!rows?.length) return null;

    for (let i = 0; i < rows.length; i++) {
      const rect = rows[i].getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }

    return rows.length - 1;
  }, []);

  useEffect(() => {
    if (draggedIndex === null) return;

    const handlePointerMove = (event: PointerEvent) => {
      const index = getIndexAtPointer(event.clientY);
      if (index === null) return;
      dropIndexRef.current = index;
      setDropIndex(index);
    };

    const handlePointerUp = () => {
      const from = draggedIndexRef.current;
      const to = dropIndexRef.current;

      if (from !== null && to !== null && from !== to) {
        setDraftOrder((prev) => reorderList(prev, from, to));
      }

      draggedIndexRef.current = null;
      dropIndexRef.current = null;
      setDraggedIndex(null);
      setDropIndex(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [draggedIndex, getIndexAtPointer]);

  const orderedItems = getOrderedNavItems(draftOrder);
  const visibleCount = orderedItems.filter((item) =>
    isNavTabActive(item.href, draftHiddenNavHrefs)
  ).length;

  const isDefaultDraft =
    ordersMatch(draftOrder, VISIBLE_NAV_ORDER) && draftHiddenNavHrefs.length === 0;

  const hasUnsavedChanges =
    !ordersMatch(draftOrder, savedOrder) || !hiddenMatch(draftHiddenNavHrefs, savedHidden);

  const handleSave = () => {
    runAfterToast(
      () => showSavedToast("Navigation tabs"),
      () => {
        setNavOrder(draftOrder);
        setHiddenNavHrefs(draftHiddenNavHrefs);
      }
    );
  };

  const handleResetDraft = () => {
    setDraftOrder([...savedOrder]);
    setDraftHiddenNavHrefs([...savedHidden]);
  };

  const handleApplyDefault = () => {
    resetNavOrder();
  };

  const startDrag = (index: number, event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    draggedIndexRef.current = index;
    dropIndexRef.current = index;
    setDraggedIndex(index);
    setDropIndex(index);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">
            {visibleCount} of {orderedItems.length} modules visible
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Drag to reorder · toggle visibility per module
          </p>
        </div>
        <div className="flex gap-2">
          <span className="rounded-md bg-background px-2.5 py-1 text-xs font-medium ring-1 ring-border/70">
            {visibleCount} active
          </span>
          <span className="rounded-md bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border/70">
            {orderedItems.length - visibleCount} hidden
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border/80">
        <ul ref={listRef} className="divide-y divide-border/70">
        {orderedItems.map((item, index) => {
          const Icon = item.icon;
          const active = isNavTabActive(item.href, draftHiddenNavHrefs);
          const isDragging = draggedIndex === index;
          const isDropTarget =
            dropIndex === index &&
            draggedIndex !== null &&
            draggedIndex !== index;
          const groupLabel = item.groupId ? getGroupLabel(item.groupId) : null;

          return (
            <li key={item.href} data-tab-row className="bg-background">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 transition-all duration-150 sm:gap-3 sm:px-4",
                  item.groupId && "border-l-2 border-l-primary/25 pl-4 sm:pl-5",
                  !active && "bg-muted/10 opacity-70",
                  isDragging && "opacity-40",
                  isDropTarget && "bg-primary/5 ring-1 ring-inset ring-primary/30"
                )}
              >
                <span className="w-5 shrink-0 text-center text-xs font-mono text-muted-foreground">
                  {index + 1}
                </span>

                <button
                  type="button"
                  className={cn(
                    "flex h-8 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing",
                    isDragging && "cursor-grabbing border-primary text-primary"
                  )}
                  aria-label={`Drag to reorder ${item.label}`}
                  onPointerDown={(event) => startDrag(index, event)}
                >
                  <GripVertical className="h-4 w-4" />
                </button>

                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  {groupLabel && (
                    <span className="block truncate text-[11px] text-muted-foreground">
                      Submenu · {groupLabel}
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    {active ? "Visible" : "Hidden"}
                  </span>
                  <Switch
                    checked={active}
                    onCheckedChange={(checked) => {
                      setDraftHiddenNavHrefs((prev) =>
                        checked
                          ? prev.filter((href) => href !== item.href)
                          : prev.includes(item.href)
                            ? prev
                            : [...prev, item.href]
                      );
                    }}
                    aria-label={`${active ? "Hide" : "Show"} ${item.label} in sidebar`}
                  />
                </div>
              </div>
            </li>
          );
        })}
        </ul>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResetDraft}
          disabled={!hasUnsavedChanges}
        >
          <RotateCcw className="h-4 w-4" />
          Discard Changes
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleApplyDefault}
            disabled={isDefaultDraft && !hasUnsavedChanges}
          >
            Use Default Order
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={!hasUnsavedChanges}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
