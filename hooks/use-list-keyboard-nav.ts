"use client";

import { useEffect, type RefObject } from "react";

function isVisibleFocusTarget(element: HTMLElement): boolean {
  if (element.getAttribute("tabindex") === "-1") return false;
  if (element.closest("[inert]")) return false;
  if (element.hasAttribute("disabled") || element.getAttribute("aria-hidden") === "true") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function getFocusableItems(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex="0"]'
    )
  ).filter(isVisibleFocusTarget);
}

/** Arrow Up/Down/Home/End navigation within a list container. */
export function useListKeyboardNav(containerRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
      if (!container.contains(document.activeElement)) return;

      const items = getFocusableItems(container);
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      if (currentIndex === -1) return;

      event.preventDefault();

      let nextIndex = currentIndex;
      if (event.key === "ArrowDown") {
        nextIndex = Math.min(items.length - 1, currentIndex + 1);
      } else if (event.key === "ArrowUp") {
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = items.length - 1;
      }

      items[nextIndex]?.focus({ preventScroll: true });
    };

    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [containerRef]);
}
