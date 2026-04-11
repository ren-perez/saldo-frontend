"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Id } from "../../../convex/_generated/dataModel";

import {
  Card,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  ChevronDown,
  Tag,
  FolderOpen,
  MoreHorizontal,
  Pencil,
  Trash2,
  Info,
  ChevronsUpDown,
  Zap,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

// ─── colour palette ────────────────────────────────────────────────────────────
const GROUP_COLORS = [
  {
    bg: "bg-slate-100 dark:bg-slate-800/40",
    border: "border-slate-200 dark:border-slate-700/50",
    trigger: "hover:bg-slate-200/70 dark:hover:bg-slate-800/80",
    badge: "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-100 dark:border-blue-900/50",
    trigger: "hover:bg-blue-100/70 dark:hover:bg-blue-900/50",
    badge: "bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300",
    dot: "bg-blue-400",
  },
  {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-100 dark:border-emerald-900/50",
    trigger: "hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50",
    badge: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-400",
  },
  {
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-100 dark:border-violet-900/50",
    trigger: "hover:bg-violet-100/70 dark:hover:bg-violet-900/50",
    badge: "bg-violet-100 dark:bg-violet-900/60 text-violet-700 dark:text-violet-300",
    dot: "bg-violet-400",
  },
  {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-100 dark:border-amber-900/50",
    trigger: "hover:bg-amber-100/70 dark:hover:bg-amber-900/50",
    badge: "bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-100 dark:border-rose-900/50",
    trigger: "hover:bg-rose-100/70 dark:hover:bg-rose-900/50",
    badge: "bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300",
    dot: "bg-rose-400",
  },
];

const ungroupedColor = {
  bg: "bg-muted/40",
  border: "border-muted",
  trigger: "hover:bg-muted/60",
  badge: "bg-muted text-muted-foreground",
  dot: "bg-muted-foreground/40",
};

const getGroupColor = (index: number) =>
  GROUP_COLORS[index % GROUP_COLORS.length];

// ─── type helpers ──────────────────────────────────────────────────────────────
type Category = {
  _id: Id<"categories">;
  name: string;
  groupId?: Id<"category_groups">;
  transactionType?: string;
};

type CategoryGroup = {
  _id: Id<"category_groups">;
  name: string;
};

const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const TRANSACTION_TYPE_PILL: Record<string, string> = {
  income:
    "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300",
  expense:
    "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300",
  transfer:
    "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300",
};

// ─── sub-components ────────────────────────────────────────────────────────────

function TransactionTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TRANSACTION_TYPE_PILL[type] ?? "bg-muted text-muted-foreground"
        }`}
    >
      {TRANSACTION_TYPE_LABELS[type] ?? type}
    </span>
  );
}

function CategoryRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category;
  onEdit: (cat: Category) => void;
  onDelete: (id: Id<"categories">) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-accent/90 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
        <span className="text-sm font-medium truncate">{cat.name}</span>
        <TransactionTypeBadge type={cat.transactionType} />
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
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

function GroupSection({
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
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""
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

// ─── Rule types ───────────────────────────────────────────────────────────────

type CategoryRule = {
  _id: Id<"category_rules">;
  pattern: string;
  categoryId: Id<"categories">;
  priority: number;
  isActive: boolean;
};

// ─── RuleRow sub-component ─────────────────────────────────────────────────────

function RuleRow({
  rule,
  categoryName,
  onDelete,
  onToggle,
}: {
  rule: CategoryRule;
  categoryName: string;
  onDelete: (id: Id<"category_rules">) => void;
  onToggle: (id: Id<"category_rules">, isActive: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 rounded-lg hover:bg-accent/90 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <Zap className={`h-3.5 w-3.5 shrink-0 ${rule.isActive ? "text-amber-500" : "text-muted-foreground/40"}`} />
        <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded text-foreground/80">
          {rule.pattern}
        </code>
        <span className="text-xs text-muted-foreground">→</span>
        <span className="text-sm font-medium truncate">{categoryName}</span>
        <span className="text-[11px] text-muted-foreground/60 shrink-0">
          p{rule.priority}
        </span>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onToggle(rule._id, !rule.isActive)}
        >
          {rule.isActive
            ? <ToggleRight className="h-4 w-4 text-emerald-500" />
            : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
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

// ─── main page ─────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { convexUser } = useConvexUser();

  const categories = useQuery(
    convexUser ? api.categories.listCategories : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as Category[] | undefined;

  const categoryGroups = useQuery(
    convexUser ? api.categoryGroups.listCategoryGroups : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as CategoryGroup[] | undefined;

  const rules = useQuery(
    convexUser ? api.categoryRules.listRules : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as CategoryRule[] | undefined;

  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
  const createCategoryGroup = useMutation(api.categoryGroups.createCategoryGroup);
  const updateCategoryGroup = useMutation(api.categoryGroups.updateCategoryGroup);
  const deleteCategoryGroup = useMutation(api.categoryGroups.deleteCategoryGroup);
  const createRule = useMutation(api.categoryRules.createRule);
  const updateRule = useMutation(api.categoryRules.updateRule);
  const deleteRule = useMutation(api.categoryRules.deleteRule);

  // ── dialog states ──
  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [showRuleDialog, setShowRuleDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);
  const [ruleError, setRuleError] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    groupId: "",
    transactionType: "",
  });

  const [groupForm, setGroupForm] = useState({ name: "" });

  const [ruleForm, setRuleForm] = useState({
    pattern: "",
    categoryId: "",
    priority: "0",
  });

  // ── accordion open state ──
  // Keyed by group._id or "ungrouped". All closed by default.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const allExpanded = Object.values(openSections).some(Boolean);

  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setOpenSections({});
    } else {
      const allKeys: Record<string, boolean> = {};
      (categoryGroups ?? []).forEach((g) => { allKeys[g._id] = true; });
      allKeys["ungrouped"] = true;
      setOpenSections(allKeys);
    }
  }, [allExpanded, categoryGroups]);

  const setSectionOpen = useCallback((key: string, open: boolean) => {
    setOpenSections((prev) => ({ ...prev, [key]: open }));
  }, []);

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Sign in required</p>
        </div>
      </AppLayout>
    );
  }

  // ── handlers ──

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    await createCategory({
      userId: convexUser._id,
      name: categoryForm.name,
      groupId: categoryForm.groupId
        ? (categoryForm.groupId as Id<"category_groups">)
        : undefined,
      transactionType: categoryForm.transactionType || undefined,
    });
    setCategoryForm({ name: "", groupId: "", transactionType: "" });
    setShowCategoryDialog(false);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    await updateCategory({
      categoryId: editingCategory._id,
      updates: {
        name: editingCategory.name,
        groupId: editingCategory.groupId || undefined,
        transactionType: editingCategory.transactionType || undefined,
      },
    });
    setEditingCategory(null);
  };

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    if (confirm("Delete this category?")) {
      await deleteCategory({ categoryId });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    await createCategoryGroup({ userId: convexUser._id, name: groupForm.name });
    setGroupForm({ name: "" });
    setShowGroupDialog(false);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    await updateCategoryGroup({
      groupId: editingGroup._id,
      updates: { name: editingGroup.name },
    });
    setEditingGroup(null);
  };

  const handleDeleteGroup = async (groupId: Id<"category_groups">) => {
    const groupCats = categories?.filter((c) => c.groupId === groupId) || [];
    if (groupCats.length > 0) {
      alert("Move or delete the categories in this group first.");
      return;
    }
    if (confirm("Delete this group?")) {
      await deleteCategoryGroup({ groupId });
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError(null);
    if (!ruleForm.pattern.trim() || !ruleForm.categoryId) return;
    try {
      await createRule({
        userId: convexUser._id,
        pattern: ruleForm.pattern.trim(),
        categoryId: ruleForm.categoryId as Id<"categories">,
        priority: parseInt(ruleForm.priority, 10) || 0,
      });
      setRuleForm({ pattern: "", categoryId: "", priority: "0" });
      setShowRuleDialog(false);
    } catch (err) {
      setRuleError(err instanceof Error ? err.message : "Failed to create rule");
    }
  };

  const handleDeleteRule = async (ruleId: Id<"category_rules">) => {
    if (confirm("Delete this rule?")) {
      await deleteRule({ ruleId });
    }
  };

  const handleToggleRule = async (ruleId: Id<"category_rules">, isActive: boolean) => {
    await updateRule({ ruleId, updates: { isActive } });
  };

  const openEditCategory = (cat: Category) => setEditingCategory(cat);
  const openEditGroup = (g: CategoryGroup) => setEditingGroup(g);

  // ── derived data (sorted alphabetically) ──
  const allCategories = [...(categories ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const allGroups = [...(categoryGroups ?? [])].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const groupedMap = new Map<string, Category[]>();
  allGroups.forEach((g) => groupedMap.set(g._id, []));
  const ungrouped: Category[] = [];

  allCategories.forEach((cat) => {
    if (cat.groupId && groupedMap.has(cat.groupId)) {
      groupedMap.get(cat.groupId)!.push(cat);
    } else {
      ungrouped.push(cat);
    }
  });

  // Build a categoryId → name lookup for rules display
  const categoryNameMap = new Map(allCategories.map((c) => [c._id as string, c.name]));

  const isLoading = categories === undefined || categoryGroups === undefined;
  const hasContent = allCategories.length > 0 || allGroups.length > 0;
  const activeRules = (rules ?? []).filter((r) => r.isActive);
  const inactiveRules = (rules ?? []).filter((r) => !r.isActive);

  return (
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-6">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Tag className="h-8 w-8 text-primary" />
            Categories
          </h1>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Organise your transactions with categories and groups</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Tabs defaultValue="categories" onValueChange={setActiveTab}>
          <div className="flex items-center mb-6">
            <TabsList>
              <TabsTrigger value="categories" className="gap-2">
                <Tag className="h-3.5 w-3.5" />
                Categories
              </TabsTrigger>
              <TabsTrigger value="rules" className="gap-2">
                <Zap className="h-3.5 w-3.5" />
                Auto-Rules
                {(rules?.length ?? 0) > 0 && (
                  <span className="ml-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-[10px] font-medium px-1.5 py-0.5">
                    {rules?.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Per-tab CTAs — always right-aligned ── */}
            <div className="ml-auto flex items-center gap-2">
              {activeTab === "categories" ? (
                <>
                  {hasContent && !isLoading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleAll}
                      className="gap-2 text-muted-foreground"
                    >
                      <ChevronsUpDown className="h-4 w-4" />
                      {allExpanded ? "Collapse All" : "Expand All"}
                    </Button>
                  )}
                  <Button onClick={() => setShowCategoryDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowGroupDialog(true)}
                    className="gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Add Group
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => { setRuleError(null); setShowRuleDialog(true); }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              )}
            </div>
          </div>

          {/* ══ Categories tab ══ */}
          <TabsContent value="categories">
            {/* ── Loading skeleton ── */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-14 rounded-xl bg-muted animate-pulse"
                  />
                ))}
              </div>
            ) : !hasContent ? (
              /* ── Empty state ── */
              <Card className="p-12 text-center">
                <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <Tag className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No categories yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Create groups to organise your categories, then add categories to
                  track your transactions.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button onClick={() => setShowCategoryDialog(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Category
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowGroupDialog(true)}
                    className="gap-2"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Add Group
                  </Button>
                </div>
              </Card>
            ) : (
              /* ── Group accordion sections ── */
              <div className="space-y-4">
                {allGroups.map((group, idx) => (
                  <GroupSection
                    key={group._id}
                    group={group}
                    colorIndex={idx}
                    categories={groupedMap.get(group._id) ?? []}
                    onEditCategory={openEditCategory}
                    onDeleteCategory={handleDeleteCategory}
                    onEditGroup={openEditGroup}
                    onDeleteGroup={handleDeleteGroup}
                    open={openSections[group._id] ?? false}
                    onOpenChange={(val) => setSectionOpen(group._id, val)}
                  />
                ))}

                {ungrouped.length > 0 && (
                  <>
                    {allGroups.length > 0 && <Separator className="my-1" />}
                    <GroupSection
                      group={null}
                      colorIndex={0}
                      categories={ungrouped}
                      onEditCategory={openEditCategory}
                      onDeleteCategory={handleDeleteCategory}
                      onEditGroup={() => { }}
                      onDeleteGroup={() => { }}
                      open={openSections["ungrouped"] ?? false}
                      onOpenChange={(val) => setSectionOpen("ungrouped", val)}
                    />
                  </>
                )}
              </div>
            )}
          </TabsContent>

          {/* ══ Rules tab ══ */}
          <TabsContent value="rules">
            {rules === undefined ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />
                ))}
              </div>
            ) : rules.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="mx-auto w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-5">
                  <Zap className="h-10 w-10 text-amber-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No auto-rules yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  Rules automatically categorise new transactions when their description
                  contains a keyword you define.
                </p>
                <Button
                  onClick={() => { setRuleError(null); setShowRuleDialog(true); }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {/* Active rules */}
                {activeRules.length > 0 && (
                  <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-3">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-sm font-semibold">Active Rules</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                        {activeRules.length}
                      </span>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-card p-2 space-y-0.5">
                      {activeRules.map((rule) => (
                        <RuleRow
                          key={rule._id}
                          rule={rule}
                          categoryName={categoryNameMap.get(rule.categoryId as string) ?? "Unknown"}
                          onDelete={handleDeleteRule}
                          onToggle={handleToggleRule}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Inactive rules */}
                {inactiveRules.length > 0 && (
                  <div className="rounded-xl border border-muted overflow-hidden">
                    <div className="px-4 py-3 bg-muted/40 flex items-center gap-3">
                      <Zap className="h-3.5 w-3.5 text-muted-foreground/40" />
                      <span className="text-sm font-semibold text-muted-foreground">Paused Rules</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {inactiveRules.length}
                      </span>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-card p-2 space-y-0.5">
                      {inactiveRules.map((rule) => (
                        <RuleRow
                          key={rule._id}
                          rule={rule}
                          categoryName={categoryNameMap.get(rule.categoryId as string) ?? "Unknown"}
                          onDelete={handleDeleteRule}
                          onToggle={handleToggleRule}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground px-1">
                  Rules are checked in priority order (highest first). The first matching
                  keyword wins. Manual overrides always take precedence.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Create Rule Dialog ── */}
        <Dialog open={showRuleDialog} onOpenChange={(open) => { setShowRuleDialog(open); if (!open) setRuleError(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                New Auto-Rule
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>When a transaction description contains this keyword, the category is applied automatically.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateRule} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Keyword</label>
                <Input
                  value={ruleForm.pattern}
                  onChange={(e) => setRuleForm((p) => ({ ...p, pattern: e.target.value }))}
                  placeholder="e.g. netflix, uber, starbucks"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Case-insensitive. Matches anywhere in the transaction description.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={ruleForm.categoryId || "none"}
                    onValueChange={(val) =>
                      setRuleForm((p) => ({ ...p, categoryId: val === "none" ? "" : val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select category</SelectItem>
                      {allCategories.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Priority</label>
                  <Input
                    type="number"
                    value={ruleForm.priority}
                    onChange={(e) => setRuleForm((p) => ({ ...p, priority: e.target.value }))}
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground">Higher = checked first</p>
                </div>
              </div>
              {ruleError && (
                <p className="text-sm text-destructive">{ruleError}</p>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowRuleDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!ruleForm.pattern.trim() || !ruleForm.categoryId}>
                  Create Rule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

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
          onOpenChange={(open) => { if (!open) setEditingCategory(null); }}
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

        {/* ── Create Group Dialog ── */}
        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                New Group
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Create a group to organise related categories together.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="e.g., Bills, Food & Dining"
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGroupDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create Group</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── Edit Group Dialog ── */}
        <Dialog
          open={!!editingGroup}
          onOpenChange={(open) => { if (!open) setEditingGroup(null); }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Rename Group
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Update the name of this category group.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </DialogTitle>
            </DialogHeader>
            {editingGroup && (
              <form onSubmit={handleUpdateGroup} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Group Name</label>
                  <Input
                    value={editingGroup.name}
                    onChange={(e) =>
                      setEditingGroup((p) =>
                        p ? { ...p, name: e.target.value } : null
                      )
                    }
                    required
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingGroup(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}