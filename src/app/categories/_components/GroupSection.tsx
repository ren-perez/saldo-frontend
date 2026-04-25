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
      <div className="group/section">
        {/* Section header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-2 py-2 px-1 select-none">
            <div className={`h-2 w-2 rounded-full shrink-0 ${color.dot}`} />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {group?.name ?? "Ungrouped"}
            </span>
            <span className="text-xs text-muted-foreground/50">({categories.length})</span>
            <span className="flex-1 h-px bg-border" />

            {group && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div
                    role="button"
                    onClick={(e) => e.stopPropagation()}
                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover/section:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => onEditGroup(group)} className="gap-2">
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

            <ChevronDown
              className={`h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>

        {/* Category list */}
        <CollapsibleContent>
          <div className="flex flex-col gap-2 pb-3">
            {categories.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-4 text-center">
                No categories in this group yet.
              </p>
            ) : (
              categories.map((cat) => (
                <CategoryRow
                  key={cat._id}
                  cat={cat}
                  onEdit={onEditCategory}
                  onDelete={onDeleteCategory}
                />
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
