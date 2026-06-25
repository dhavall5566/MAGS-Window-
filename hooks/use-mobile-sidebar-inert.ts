"use client";

import { useEffect, type RefObject } from "react";

/** Prevent keyboard focus from entering the sidebar while it is off-screen on mobile. */
export function useMobileSidebarInert(
  asideRef: RefObject<HTMLElement | null>,
  open: boolean
) {
  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const media = window.matchMedia("(min-width: 1024px)");

    const sync = () => {
      const desktop = media.matches;
      if (!desktop && !open) {
        aside.setAttribute("inert", "");
        aside.setAttribute("aria-hidden", "true");
      } else {
        aside.removeAttribute("inert");
        aside.removeAttribute("aria-hidden");
      }
    };

    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [asideRef, open]);
}
