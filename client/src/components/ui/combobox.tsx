"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react";

interface ComboboxOption {
  value: string;
  label: string;
  group?: string;
}

interface ComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";

  const filtered = React.useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  // Group filtered options
  const grouped = React.useMemo(() => {
    const groups: Record<string, ComboboxOption[]> = {};
    for (const opt of filtered) {
      const g = opt.group || "";
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    }
    return groups;
  }, [filtered]);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus input on open
  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen(!open); }}
        className={cn(
          "flex w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none h-8",
          "focus-visible:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-200",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-input/50",
          open && "border-slate-400 ring-1 ring-slate-200",
        )}
      >
        <span className={cn("line-clamp-1 text-left flex-1", !value && "text-muted-foreground")}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-popover text-popover-foreground ring-1 ring-foreground/10 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <SearchIcon className="size-3.5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No results found</div>
            ) : (
              Object.entries(grouped).map(([group, items], gi) => (
                <div key={group || gi}>
                  {group && (
                    <div className="px-1.5 py-1 text-xs text-muted-foreground select-none">{group}</div>
                  )}
                  {gi > 0 && group && (
                    <div className="-mx-1 my-1 h-px bg-border" />
                  )}
                  {items.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        onValueChange(opt.value);
                        setOpen(false);
                        setSearch("");
                      }}
                      className={cn(
                        "relative flex w-full items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-none select-none",
                        "hover:bg-accent hover:text-accent-foreground",
                        opt.value === value && "bg-accent text-accent-foreground",
                      )}
                    >
                      <span className="flex-1 text-left truncate">{opt.label}</span>
                      {opt.value === value && (
                        <span className="absolute right-2 flex size-4 items-center justify-center">
                          <CheckIcon className="size-3.5" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { Combobox };
export type { ComboboxOption, ComboboxProps };
