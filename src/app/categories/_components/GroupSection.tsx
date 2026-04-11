import { Id } from "../../../../convex/_generated/dataModel";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Category, CategoryGroup } from "../types";
import { getGroupColor, ungroupedColor } from "../constants";
import { CategoryRow } from "./CategoryRow";

export function GroupSection({
  group,
  colorIndex,
  categories,
  onEditCategory,
  onDeleteCategory,
  onEditGroup,
  onDeleteGroup,
  open,
  onOpenChange,
}: {
  group: CategoryGroup | null;
  colorIndex: number;
  categories: Category[];
  onEditCategory: (cat: Category) => void;
  onDeleteCategory: (id: Id<"categories">) => void;
  onEditGroup: (g: CategoryGroup) => void;
  onDeleteGroup: (id: Id<"category_groups">) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const color = group ? getGroupColor(colorIndex) : ungroupedColor;

  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <div className={`rounded-xl border ${color.border} overflow-hidden`}>
        {/* Group header */}
        <CollapsibleTrigger asChild>
          <button
            className={`w-full flex items-center justify-between px-4 py-3 ${color.bg} ${color.trigger} transition-colors`}
          >
            <div className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full ${color.dot}`} />
              <span className="text-sm font-semibold">
                {group?.name ?? "Ungrouped"}
              </span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${color.badge}`}
              >
                {categories.length}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {group && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      role="button"
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                    >
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    <DropdownMenuItem
                      onClick={() => onEditGroup(group)}
                      className="gap-2"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDeleteGroup(group._id)}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <div className="h-7 w-7 flex items-center justify-center">
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Category list */}
        <CollapsibleContent>
          <div className="bg-background/70 divide-y divide-border/50">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-4 text-center bg-gray-50/50 dark:bg-card">
                No categories in this group yet.
              </p>
            ) : (
              <div className="p-2 space-y-0.5 bg-gray-50/50 dark:bg-card">
                {categories.map((cat) => (
                  <CategoryRow
                    key={cat._id}
                    cat={cat}
                    onEdit={onEditCategory}
                    onDelete={onDeleteCategory}
                  />
                ))}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
