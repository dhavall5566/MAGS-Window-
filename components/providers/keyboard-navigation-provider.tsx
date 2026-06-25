"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { KeyboardShortcutsDialog } from "@/components/shared/keyboard-shortcuts-dialog";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

function hasOpenDialog(): boolean {
  return Boolean(
    document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')
  );
}

function focusMainContent() {
  const main =
    document.getElementById("page-title") ?? document.getElementById("main-content");
  main?.focus({ preventScroll: true });
}

function focusNavigation() {
  const nav = document.getElementById("app-navigation");
  const firstLink = nav?.querySelector<HTMLElement>('a[href]:not([tabindex="-1"]), button');
  firstLink?.focus({ preventScroll: true });
}

function focusPageSearch() {
  const main = document.getElementById("main-content");
  const search = main?.querySelector<HTMLInputElement>(
    'input[type="search"], input[placeholder*="Search" i], input[aria-label*="Search" i]'
  );
  if (!search) return;
  search.focus({ preventScroll: true });
  search.select();
}

interface KeyboardNavigationProviderProps {
  onCloseMobileSidebar?: () => void;
}

export function KeyboardNavigationProvider({
  onCloseMobileSidebar,
}: KeyboardNavigationProviderProps) {
  const pathname = usePathname();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const frame = requestAnimationFrame(() => {
      if (document.activeElement === document.body) {
        focusMainContent();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!hasOpenDialog()) {
          onCloseMobileSidebar?.();
        }
        return;
      }

      if (isTypingTarget(event.target)) return;

      if (
        event.key === "?" ||
        (event.code === "Slash" && event.shiftKey) ||
        (event.key === "/" && event.shiftKey)
      ) {
        event.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        focusMainContent();
        return;
      }

      if (event.altKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        focusNavigation();
        return;
      }

      if (
        event.key === "/" &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        focusPageSearch();
      }
    },
    [onCloseMobileSidebar]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <KeyboardShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
  );
}
