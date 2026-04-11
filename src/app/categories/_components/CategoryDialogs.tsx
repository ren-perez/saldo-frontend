import React from "react";
import { Id } from "../../../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { Category, CategoryGroup } from "../types";

type CategoryForm = {
  name: string;
  groupId: string;
  transactionType: string;
};

export function CategoryDialogs({
  showCategoryDialog,
  setShowCategoryDialog,
  editingCategory,
  setEditingCategory,
  categoryForm,
  setCategoryForm,
  allGroups,
  handleCreateCategory,
  handleUpdateCategory,
}: {
  showCategoryDialog: boolean;
  setShowCategoryDialog: (open: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: React.Dispatch<React.SetStateAction<Category | null>>;
  categoryForm: CategoryForm;
  setCategoryForm: React.Dispatch<React.SetStateAction<CategoryForm>>;
  allGroups: CategoryGroup[];
  handleCreateCategory: (e: React.FormEvent) => Promise<void>;
  handleUpdateCategory: (e: React.FormEvent) => Promise<void>;
}) {
  return (
    <>
      {/* ── Create Category Dialog ── */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              New Category
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create a new category to organise your transactions.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateCategory} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g., Groceries, Gas"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Transaction Type</label>
                <Select
                  value={categoryForm.transactionType || "none"}
                  onValueChange={(val) =>
                    setCategoryForm((p) => ({
                      ...p,
                      transactionType: val === "none" ? "" : val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Type</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Group</label>
                <Select
                  value={categoryForm.groupId || "none"}
                  onValueChange={(val) =>
                    setCategoryForm((p) => ({
                      ...p,
                      groupId: val === "none" ? "" : val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No Group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Group</SelectItem>
                    {allGroups.map((g) => (
                      <SelectItem key={g._id} value={g._id}>
                        {g.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCategoryDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Category</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Category Dialog ── */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit Category
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Update the details for this category.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <form onSubmit={handleUpdateCategory} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory((p) =>
                      p ? { ...p, name: e.target.value } : null
                    )
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Transaction Type</label>
                  <Select
                    value={editingCategory.transactionType || "none"}
                    onValueChange={(val) =>
                      setEditingCategory((p) =>
                        p
                          ? {
                              ...p,
                              transactionType:
                                val === "none" ? undefined : val,
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Type</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="transfer">Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Group</label>
                  <Select
                    value={editingCategory.groupId || "none"}
                    onValueChange={(val) =>
                      setEditingCategory((p) =>
                        p
                          ? {
                              ...p,
                              groupId:
                                val === "none"
                                  ? undefined
                                  : (val as Id<"category_groups">),
                            }
                          : null
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No Group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Group</SelectItem>
                      {allGroups.map((g) => (
                        <SelectItem key={g._id} value={g._id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingCategory(null)}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
