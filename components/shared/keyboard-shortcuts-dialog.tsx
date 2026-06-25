"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUT_GROUPS = [
  {
    title: "Global",
    shortcuts: [
      { keys: "Tab / Shift+Tab", description: "Move focus between controls" },
      { keys: "?", description: "Show this keyboard shortcuts guide" },
      { keys: "Alt + M", description: "Focus main content" },
      { keys: "Alt + N", description: "Focus sidebar navigation" },
      { keys: "/", description: "Focus page search" },
      { keys: "Escape", description: "Close dialogs, menus, and mobile sidebar" },
    ],
  },
  {
    title: "Navigation",
    shortcuts: [
      { keys: "↑ / ↓", description: "Move between sidebar links and groups" },
      { keys: "Enter / Space", description: "Open link or toggle group" },
    ],
  },
  {
    title: "Tables",
    shortcuts: [
      { keys: "↑ / ↓", description: "Move between table rows when a row is focused" },
      { keys: "Tab", description: "Reach row actions and toolbar controls" },
    ],
  },
  {
    title: "Dropdowns & selects",
    shortcuts: [
      { keys: "↑ / ↓", description: "Highlight options in searchable selects" },
      { keys: "Enter", description: "Select highlighted option" },
      { keys: "← / →", description: "Switch segmented control tabs" },
    ],
  },
];

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Navigate the app without a mouse. Press <kbd className="kbd">?</kbd> anytime
            to reopen this guide.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 pt-1">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 text-sm font-semibold text-foreground">{group.title}</h3>
              <ul className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <li
                    key={shortcut.keys}
                    className="flex items-start justify-between gap-4 text-sm"
                  >
                    <span className="text-muted-foreground">{shortcut.description}</span>
                    <kbd className="kbd shrink-0 text-right">{shortcut.keys}</kbd>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
