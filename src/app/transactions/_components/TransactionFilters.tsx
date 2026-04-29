"use client";

import { useState } from "react";
import { Search, X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { FilterState, Account, Category, CategoryGroup } from "../_types";
import { Id } from "../../../../convex/_generated/dataModel";

interface TransactionFiltersProps {
  filters: FilterState;
  onFiltersChange: (patch: Partial<FilterState>) => void;
  onClearAll: () => void;
  accounts: Account[];
  categories: Category[];
  categoryGroups: CategoryGroup[];
  totalCount?: number;
}

const TYPE_TABS = [
  { value: null, label: "All" },
  { value: "income", label: "Income" },
  { value: "expense", label: "Expenses" },
  { value: "transfer", label: "Transfers" },
  { value: "UNTYPED", label: "Untyped" },
] as const;

const QUICK_FILTERS = [
  { label: "This Month", id: "mtd" },
  { label: "Expenses", id: "expenses" },
] as const;

export function TransactionFilters({
  filters,
  onFiltersChange,
  onClearAll,
  accounts,
  categories,
  categoryGroups,
  totalCount,
}: TransactionFiltersProps) {
  const [open, setOpen] = useState(true);

  const { selectedAccount, search, typeFilter, categoryFilter, groupFilter, startDate, endDate } =
    filters;

  const activeCount = [
    selectedAccount,
    typeFilter,
    categoryFilter,
    groupFilter,
    startDate,
    endDate,
    search,
  ].filter(Boolean).length;

  const categoryOptions = categories
    .map((c) => ({ value: c._id, label: c.name }))
    .filter((o) => o.value?.trim())
    .sort((a, b) => a.label.localeCompare(b.label));

  const groupOptions = categoryGroups
    .map((g) => ({ value: g._id, label: g.name }))
    .filter((o) => o.value?.trim())
    .sort((a, b) => a.label.localeCompare(b.label));

  const patch = (p: Partial<FilterState>) => onFiltersChange(p);

  const handleMTD = () => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    patch({
      startDate: first.toISOString().slice(0, 10),
      endDate: now.toISOString().slice(0, 10),
    });
  };

  const handleQuickFilter = (id: string) => {
    if (id === "mtd") handleMTD();
    if (id === "expenses") patch({ typeFilter: "expense" });
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      {/* ── Header row — always visible, acts as trigger ─────────────── */}
      <CollapsibleTrigger asChild>
        <div
          role="button"
          className="flex w-full items-center gap-2 py-1.5 select-none cursor-pointer"
        >
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide shrink-0">
            Filters
          </span>

          {activeCount > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] shrink-0">
              {activeCount}
            </Badge>
          )}

          {/* Expanding line */}
          <span className="flex-1 h-px bg-border" />

          {/* Quick filters — stopPropagation so they don't toggle collapse */}
          <div
            className="flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => handleQuickFilter(f.id)}
                className="text-xs px-2 py-0.5 rounded-md border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Vertical divider */}
          <span className="h-4 w-px bg-border shrink-0 ml-1" />

          {/* Clear all — stopPropagation */}
          {activeCount > 0 && (
            <div onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                onClick={onClearAll}
                className="h-6 gap-1 text-muted-foreground hover:text-foreground text-xs px-2"
              >
                Clear all
              </Button>
            </div>
          )}

          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0",
              open && "rotate-180"
            )}
          />
        </div>
      </CollapsibleTrigger>

      {/* ── Collapsible filter rows ───────────────────────────────────── */}
      <div className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-in-out",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      )}>
        <div className="overflow-hidden">
        <div className="flex flex-col gap-3 pt-3">
          {/* Row 1: Type tabs + Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {TYPE_TABS.map((tab) => (
                <Button
                  key={tab.label}
                  variant={typeFilter === tab.value ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs flex-shrink-0"
                  onClick={() => patch({ typeFilter: tab.value })}
                >
                  {tab.label}
                  {totalCount !== undefined && tab.value === null && (
                    <span className="ml-1.5 opacity-70">{totalCount}</span>
                  )}
                </Button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => patch({ search: e.target.value })}
                className="pl-9 pr-9 h-8 text-sm"
              />
              {search && (
                <button
                  onClick={() => patch({ search: "" })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Account + Category + Group | Dates + MTD */}
          <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-3">
            <div className="flex items-center gap-2">
              <Select
                value={selectedAccount || "ALL_ACCOUNTS"}
                onValueChange={(v) =>
                  patch({ selectedAccount: v === "ALL_ACCOUNTS" ? null : (v as Id<"accounts">) })
                }
              >
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_ACCOUNTS">All Accounts</SelectItem>
                  {accounts
                    .filter((a) => a._id?.trim())
                    .map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.name} ({a.bank})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select
                value={
                  categoryFilter === "NONE"
                    ? "UNCATEGORIZED"
                    : categoryFilter || "ALL_CATEGORIES"
                }
                onValueChange={(v) =>
                  patch({
                    categoryFilter:
                      v === "ALL_CATEGORIES" ? null : v === "UNCATEGORIZED" ? "NONE" : v,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_CATEGORIES">All Categories</SelectItem>
                  <SelectItem value="UNCATEGORIZED">-- Uncategorized --</SelectItem>
                  {categoryOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={groupFilter === "NONE" ? "UNGROUPED" : groupFilter || "ALL_GROUPS"}
                onValueChange={(v) =>
                  patch({
                    groupFilter: v === "ALL_GROUPS" ? null : v === "UNGROUPED" ? "NONE" : v,
                  })
                }
              >
                <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL_GROUPS">All Groups</SelectItem>
                  <SelectItem value="UNGROUPED">-- No Group --</SelectItem>
                  {groupOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">From</Label>
                <Input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => patch({ startDate: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">To</Label>
                <Input
                  type="date"
                  value={endDate || ""}
                  onChange={(e) => patch({ endDate: e.target.value || null })}
                  className="h-8 text-xs"
                />
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleMTD}
                      className="h-8 px-2 text-xs text-muted-foreground flex-shrink-0"
                    >
                      MTD
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Set to month-to-date</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          {/* Active filter badges */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedAccount && accounts.find((a) => a._id === selectedAccount) && (
                <FilterBadge
                  label={accounts.find((a) => a._id === selectedAccount)!.name}
                  onRemove={() => patch({ selectedAccount: null })}
                />
              )}
              {typeFilter && (
                <FilterBadge
                  label={
                    typeFilter === "UNTYPED"
                      ? "Untyped"
                      : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)
                  }
                  onRemove={() => patch({ typeFilter: null })}
                />
              )}
              {categoryFilter && categoryFilter !== "NONE" && (
                <FilterBadge
                  label={categories.find((c) => c._id === categoryFilter)?.name ?? categoryFilter}
                  onRemove={() => patch({ categoryFilter: null })}
                />
              )}
              {categoryFilter === "NONE" && (
                <FilterBadge
                  label="Uncategorized"
                  onRemove={() => patch({ categoryFilter: null })}
                />
              )}
              {groupFilter && groupFilter !== "NONE" && (
                <FilterBadge
                  label={categoryGroups.find((g) => g._id === groupFilter)?.name ?? groupFilter}
                  onRemove={() => patch({ groupFilter: null })}
                />
              )}
              {groupFilter === "NONE" && (
                <FilterBadge label="No Group" onRemove={() => patch({ groupFilter: null })} />
              )}
              {startDate && (
                <FilterBadge
                  label={`From: ${startDate}`}
                  onRemove={() => patch({ startDate: null })}
                />
              )}
              {endDate && (
                <FilterBadge label={`To: ${endDate}`} onRemove={() => patch({ endDate: null })} />
              )}
              {search && (
                <FilterBadge label={`"${search}"`} onRemove={() => patch({ search: "" })} />
              )}
            </div>
          )}
        </div>
        </div>
      </div>
    </Collapsible>
  );
}

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
