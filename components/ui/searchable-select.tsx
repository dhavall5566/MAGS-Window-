"use client";

import * as React from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function stringSelectOptions(
  values: readonly string[],
  className?: string
): SearchableSelectOption[] {
  return values.map((value) => ({ value, label: value, className }));
}

function selectOptionClass(isSelected: boolean, extra?: string) {
  return cn(
    "relative flex w-full cursor-pointer select-none items-center rounded-md py-2.5 pl-9 pr-3 text-left text-sm outline-none transition-colors",
    "hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground",
    isSelected && "bg-primary/10 font-medium text-primary",
    extra
  );
}

interface SearchableSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
  contentClassName?: string;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  "aria-invalid"?: boolean | "true" | "false";
  triggerPrefix?: React.ReactNode;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found",
  disabled = false,
  searchable = true,
  id,
  className,
  contentClassName,
  align = "start",
  side = "bottom",
  "aria-invalid": ariaInvalid,
  triggerPrefix,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const inDialog = portalContainer !== null;
  const listboxId = React.useId();

  const selected = options.find((option) => option.value === value);

  const displayedOptions = React.useMemo(() => {
    if (!searchable) return options;
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const activeOption = listRef.current?.querySelector<HTMLElement>(
      `[data-option-index="${activeIndex}"]`
    );
    activeOption?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const handleOpenChange = React.useCallback((next: boolean) => {
    if (next) {
      const dialog = triggerRef.current?.closest('[role="dialog"]');
      setPortalContainer(dialog instanceof HTMLElement ? dialog : null);
    } else {
      setPortalContainer(null);
    }
    setOpen(next);
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;

    const frame = requestAnimationFrame(() => {
      searchRef.current?.focus({ preventScroll: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [open]);

  if (!searchable) {
    return (
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={id}
          aria-invalid={ariaInvalid}
          className={cn(!selected && "text-muted-foreground", className)}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {triggerPrefix}
            <SelectValue placeholder={placeholder} />
          </span>
        </SelectTrigger>
        <SelectContent
          align={align}
          side={side}
          sideOffset={6}
          className={contentClassName}
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className={option.className}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const handleSelect = (next: string) => {
    onValueChange?.(next);
    handleOpenChange(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const count = displayedOptions.length;

    if (event.key === "Escape") {
      event.preventDefault();
      handleOpenChange(false);
      triggerRef.current?.focus({ preventScroll: true });
      return;
    }

    if (count === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => Math.min(count - 1, current + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => Math.max(0, current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(count - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = displayedOptions[activeIndex];
      if (option && !option.disabled) {
        handleSelect(option.value);
      }
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpenChange(true);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange} modal={!inDialog}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={
            open && displayedOptions[activeIndex]
              ? `${listboxId}-option-${activeIndex}`
              : undefined
          }
          aria-invalid={ariaInvalid}
          disabled={disabled}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            "form-field h-10 w-full justify-between gap-2 px-3 font-normal hover:bg-background",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 items-center gap-2 truncate">
            {triggerPrefix}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 opacity-50 transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        container={portalContainer}
        align={align}
        side={side}
        sideOffset={6}
        className={cn(
          "z-[9999] w-[var(--radix-popover-trigger-width)] min-w-[14rem] overflow-hidden rounded-lg border border-border/80 bg-popover p-1.5 shadow-lg",
          contentClassName
        )}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <div className="mb-1.5 rounded-md border border-input bg-background p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 border-0 bg-transparent pl-8 shadow-none focus-visible:ring-0"
              aria-label={searchPlaceholder}
              autoComplete="off"
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={handleSearchKeyDown}
            />
          </div>
        </div>
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="max-h-60 overflow-y-auto overscroll-contain"
        >
          {displayedOptions.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            displayedOptions.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  id={`${listboxId}-option-${index}`}
                  data-option-index={index}
                  aria-selected={isSelected}
                  disabled={option.disabled}
                  className={cn(
                    selectOptionClass(isSelected, option.className),
                    isActive && !isSelected && "bg-accent text-accent-foreground"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => handleSelect(option.value)}
                >
                  <span className="absolute left-2.5 flex h-4 w-4 items-center justify-center">
                    {isSelected && <Check className="h-4 w-4" />}
                  </span>
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
