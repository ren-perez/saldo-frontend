import { Id } from "../../../../convex/_generated/dataModel";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  GripVertical,
  Pencil,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Zap,
} from "lucide-react";
import { CategoryRule } from "../types";

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-accent/90 transition-colors group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/30 hover:text-muted-foreground transition-colors shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Zap
          className={`h-3.5 w-3.5 shrink-0 ${
            rule.isActive ? "text-amber-500" : "text-muted-foreground/40"
          }`}
        />
        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded text-foreground/80 shrink-0">
          {rule.pattern}
        </code>
        <span className="text-xs text-muted-foreground shrink-0">→</span>
        <span className="text-sm font-medium truncate">{categoryName}</span>
        {matchCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] shrink-0 px-1.5 py-0 h-4"
          >
            {matchCount} matched
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(rule)}
          title="Edit / preview rule"
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggle(rule._id, !rule.isActive)}
        >
          {rule.isActive ? (
            <ToggleRight className="h-4 w-4 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onDelete(rule._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
