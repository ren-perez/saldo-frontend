import { Id } from "../../../../convex/_generated/dataModel";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
} from "lucide-react";
import { CategoryRule } from "../types";

const ICON_BTN = "h-7 w-7 flex items-center justify-center rounded-md transition-colors";

export function RuleRow({
  rule,
  categoryName,
  matchCount,
  onEdit,
  onDelete,
  onToggle,
}: {
  rule: CategoryRule;
  categoryName: string;
  matchCount: number;
  onEdit: (rule: CategoryRule) => void;
  onDelete: (id: Id<"category_rules">) => void;
  onToggle: (id: Id<"category_rules">, isActive: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border/60 bg-card hover:bg-muted/30 transition-colors group shadow-sm",
        isDragging && "opacity-50 shadow-md"
      )}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-0.5 -ml-0.5 text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded text-foreground/80 shrink-0">
          {rule.pattern}
        </code>
        <span className="text-xs text-muted-foreground shrink-0">→</span>
        <span className="text-sm font-medium truncate">{categoryName}</span>
        {matchCount > 0 && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground shrink-0">
            {matchCount} matched
          </span>
        )}
      </div>

      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className={cn(ICON_BTN, "hover:bg-muted text-muted-foreground")}
          onClick={() => onEdit(rule)}
          title="Edit rule"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          className={cn(ICON_BTN, "hover:bg-muted")}
          onClick={() => onToggle(rule._id, !rule.isActive)}
          title={rule.isActive ? "Pause rule" : "Activate rule"}
        >
          {rule.isActive ? (
            <ToggleRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        <button
          className={cn(ICON_BTN, "hover:bg-destructive/10 text-destructive")}
          onClick={() => onDelete(rule._id)}
          title="Delete rule"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
