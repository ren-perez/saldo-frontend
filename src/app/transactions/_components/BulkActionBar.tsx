"use client";

import { Download, Trash2, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  isAllGlobalSelected: boolean;
  onSelectAllGlobal: () => void;
  onExportSelected: () => void;
  onExportAll: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  isExporting: boolean;
}

export function BulkActionBar({
  selectedCount,
  totalCount,
  isAllGlobalSelected,
  onSelectAllGlobal,
  onExportSelected,
  onExportAll,
  onDeleteSelected,
  onClearSelection,
  isExporting,
}: BulkActionBarProps) {
  const visible = selectedCount > 0;

  return (
    <div
      className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
        "transition-[transform,opacity] duration-300 ease-out will-change-transform",
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-background/95 backdrop-blur-md shadow-[0_8px_40px_rgba(0,0,0,0.14)] px-4 py-2.5">
        {/* Count + clear */}
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
            {selectedCount} selected
          </span>
          <button
            onClick={onClearSelection}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* "Select all" prompt — shown when page is fully selected but not global */}
        {!isAllGlobalSelected && selectedCount > 0 && selectedCount < totalCount && (
          <button
            onClick={onSelectAllGlobal}
            className="text-xs text-primary hover:underline whitespace-nowrap"
          >
            Select all {totalCount}
          </button>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={isAllGlobalSelected ? onExportAll : onExportSelected}
            disabled={isExporting}
            className="gap-1.5 h-8 text-xs"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting
              ? "Preparing…"
              : isAllGlobalSelected
                ? `Export all (${totalCount})`
                : `Export (${selectedCount})`}
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled
            className="gap-1.5 h-8 text-xs text-muted-foreground"
            title="Coming soon"
          >
            <Tag className="h-3.5 w-3.5" />
            Categorize
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={onDeleteSelected}
            className="gap-1.5 h-8 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete{isAllGlobalSelected ? ` all (${totalCount})` : ` (${selectedCount})`}
          </Button>
        </div>
      </div>
    </div>
  );
}
