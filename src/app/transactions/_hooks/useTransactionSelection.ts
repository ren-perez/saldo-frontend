"use client";

import { useState, useCallback } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

interface UseTransactionSelectionOptions {
  pageIds: Id<"transactions">[];
  totalCount: number;
}

export interface TransactionSelectionState {
  selectedIds: Set<Id<"transactions">>;
  isAllPageSelected: boolean;
  isAllGlobalSelected: boolean;
  selectedCount: number;
  toggleOne: (id: Id<"transactions">) => void;
  selectPage: () => void;
  selectAllGlobal: () => void;
  clearSelection: () => void;
}

export function useTransactionSelection({
  pageIds,
  totalCount,
}: UseTransactionSelectionOptions): TransactionSelectionState {
  const [selectedIds, setSelectedIds] = useState<Set<Id<"transactions">>>(new Set());
  const [isAllGlobalSelected, setIsAllGlobalSelected] = useState(false);

  const toggleOne = useCallback((id: Id<"transactions">) => {
    setIsAllGlobalSelected(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectPage = useCallback(() => {
    setIsAllGlobalSelected(false);
    setSelectedIds(new Set(pageIds));
  }, [pageIds]);

  const selectAllGlobal = useCallback(() => {
    setIsAllGlobalSelected(true);
    setSelectedIds(new Set(pageIds));
  }, [pageIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsAllGlobalSelected(false);
  }, []);

  const isAllPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const selectedCount = isAllGlobalSelected ? totalCount : selectedIds.size;

  return {
    selectedIds,
    isAllPageSelected,
    isAllGlobalSelected,
    selectedCount,
    toggleOne,
    selectPage,
    selectAllGlobal,
    clearSelection,
  };
}
