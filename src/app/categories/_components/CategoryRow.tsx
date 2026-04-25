import { Id } from "../../../../convex/_generated/dataModel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Tag, Trash2 } from "lucide-react";
import { Category } from "../types";
import { TransactionTypeBadge } from "./TransactionTypeBadge";

export function CategoryRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: Id<"categories">) => void;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="text-sm font-medium truncate">{cat.name}</span>
        <TransactionTypeBadge type={cat.transactionType} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 shrink-0">
            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => onEdit(cat)} className="gap-2">
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(cat._id)}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
