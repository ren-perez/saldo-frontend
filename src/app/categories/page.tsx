"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState, useCallback } from "react";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Id } from "../../../convex/_generated/dataModel";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { RulePreviewDialog, RuleDialogMode } from "@/components/RulePreviewDialog";

import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { Button } from "@/components/ui/button";
import {
  Plus,
  Tag,
  FolderOpen,
  Info,
  ChevronsUpDown,
  Zap,
  Lightbulb,
  ChevronRight,
} from "lucide-react";

import { Category, CategoryGroup, CategoryRule } from "./types";
import { GroupSection } from "./_components/GroupSection";
import { RuleRow } from "./_components/RuleRow";
import { CategoryDialogs } from "./_components/CategoryDialogs";
import { GroupDialogs } from "./_components/GroupDialogs";

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

  const matchCounts = useQuery(
    convexUser ? api.categoryRules.getMatchCountForRules : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as Record<string, number> | undefined;

  const suggestions = useQuery(
    convexUser ? api.categoryRules.getRuleSuggestions : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) as Array<{ description: string; normalizedDescription: string; categoryId: string; count: number }> | undefined;

  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);
  const createCategoryGroup = useMutation(api.categoryGroups.createCategoryGroup);
  const updateCategoryGroup = useMutation(api.categoryGroups.updateCategoryGroup);
  const deleteCategoryGroup = useMutation(api.categoryGroups.deleteCategoryGroup);
  const updateRule = useMutation(api.categoryRules.updateRule);
  const deleteRule = useMutation(api.categoryRules.deleteRule);
  const updateRulePriorities = useMutation(api.categoryRules.updateRulePriorities);

  // ── dialog states ──
  const [activeTab, setActiveTab] = useState("categories");
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  // RulePreviewDialog state — null = closed
  const [ruleDialogState, setRuleDialogState] = useState<RuleDialogMode | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    groupId: "",
    transactionType: "",
  });

  const [groupForm, setGroupForm] = useState({ name: "" });

  // Collapsed state for suggestions inbox
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  const handleDeleteRule = async (ruleId: Id<"category_rules">) => {
    if (confirm("Delete this rule?")) {
      await deleteRule({ ruleId });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !rules) return;

    const activeRulesList = rules.filter((r) => r.isActive);
    const inactiveRulesList = rules.filter((r) => !r.isActive);

    // Determine which list the drag happened in
    const activeIds = activeRulesList.map((r) => r._id);
    const inactiveIds = inactiveRulesList.map((r) => r._id);

    let reorderedList: CategoryRule[] | null = null;
    if (activeIds.includes(active.id as Id<"category_rules">)) {
      const oldIdx = activeIds.indexOf(active.id as Id<"category_rules">);
      const newIdx = activeIds.indexOf(over.id as Id<"category_rules">);
      if (oldIdx === -1 || newIdx === -1) return;
      reorderedList = arrayMove(activeRulesList, oldIdx, newIdx);
    } else if (inactiveIds.includes(active.id as Id<"category_rules">)) {
      const oldIdx = inactiveIds.indexOf(active.id as Id<"category_rules">);
      const newIdx = inactiveIds.indexOf(over.id as Id<"category_rules">);
      if (oldIdx === -1 || newIdx === -1) return;
      reorderedList = arrayMove(inactiveRulesList, oldIdx, newIdx);
    }

    if (!reorderedList) return;

    // Assign descending priority integers based on new order
    const updates = reorderedList.map((rule, idx) => ({
      ruleId: rule._id,
      priority: reorderedList!.length - 1 - idx,
    }));

    await updateRulePriorities({ updates });
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
                  onClick={() => setRuleDialogState({ type: "new" })}
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
                      onEditGroup={() => {}}
                      onDeleteGroup={() => {}}
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
            ) : rules.length === 0 && (!suggestions || suggestions.length === 0) ? (
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
                  onClick={() => setRuleDialogState({ type: "new" })}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Rule
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">

                {/* ── Suggested Rules Inbox ── */}
                {suggestions && suggestions.length > 0 && (
                  <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <button
                      className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 flex items-center gap-3 hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors"
                      onClick={() => setSuggestionsOpen((p) => !p)}
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm font-semibold flex-1 text-left">Suggested Rules</span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {suggestions.length}
                      </span>
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${suggestionsOpen ? "rotate-90" : ""}`} />
                    </button>
                    {suggestionsOpen && (
                      <div className="bg-zinc-50 dark:bg-zinc-900 p-2 space-y-1">
                        {suggestions.map((s, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-background border border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Lightbulb className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                              <p className="text-sm">
                                You often categorize{" "}
                                <code className="font-mono bg-muted px-1 py-0.5 rounded text-xs">
                                  {s.normalizedDescription.length > 30
                                    ? s.normalizedDescription.slice(0, 30) + "…"
                                    : s.normalizedDescription}
                                </code>{" "}
                                as{" "}
                                <span className="font-medium">
                                  {categoryNameMap.get(s.categoryId) ?? "Unknown"}
                                </span>
                                <span className="text-muted-foreground ml-1 text-xs">({s.count}×)</span>
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="shrink-0 ml-3 text-xs h-7"
                              onClick={() => setRuleDialogState({
                                type: "new",
                                prefill: { pattern: s.normalizedDescription, categoryId: s.categoryId },
                              })}
                            >
                              Create Rule
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  {/* Active rules */}
                  {activeRules.length > 0 && (
                    <div className="rounded-xl border border-amber-100 dark:border-amber-900/50 overflow-hidden">
                      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 flex items-center gap-3">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-sm font-semibold">Active Rules</span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                          {activeRules.length}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">drag to reorder</span>
                      </div>
                      <div className="bg-gray-50/50 dark:bg-card p-2 space-y-0.5">
                        <SortableContext items={activeRules.map((r) => r._id)} strategy={verticalListSortingStrategy}>
                          {activeRules.map((rule) => (
                            <RuleRow
                              key={rule._id}
                              rule={rule}
                              categoryName={categoryNameMap.get(rule.categoryId as string) ?? "Unknown"}
                              matchCount={matchCounts?.[rule._id as string] ?? 0}
                              onEdit={(r) => setRuleDialogState({ type: "edit", rule: r })}
                              onDelete={handleDeleteRule}
                              onToggle={handleToggleRule}
                            />
                          ))}
                        </SortableContext>
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
                        <SortableContext items={inactiveRules.map((r) => r._id)} strategy={verticalListSortingStrategy}>
                          {inactiveRules.map((rule) => (
                            <RuleRow
                              key={rule._id}
                              rule={rule}
                              categoryName={categoryNameMap.get(rule.categoryId as string) ?? "Unknown"}
                              matchCount={matchCounts?.[rule._id as string] ?? 0}
                              onEdit={(r) => setRuleDialogState({ type: "edit", rule: r })}
                              onDelete={handleDeleteRule}
                              onToggle={handleToggleRule}
                            />
                          ))}
                        </SortableContext>
                      </div>
                    </div>
                  )}
                </DndContext>

                <p className="text-xs text-muted-foreground px-1">
                  Rules are checked in priority order (top first). Drag rows to reorder.
                  Manual overrides always take precedence.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Rule Preview / Edit Dialog ── */}
        {ruleDialogState && convexUser && (
          <RulePreviewDialog
            mode={ruleDialogState}
            userId={convexUser._id}
            categories={allCategories}
            onClose={() => setRuleDialogState(null)}
          />
        )}

        {/* ── Category Dialogs ── */}
        <CategoryDialogs
          showCategoryDialog={showCategoryDialog}
          setShowCategoryDialog={setShowCategoryDialog}
          editingCategory={editingCategory}
          setEditingCategory={setEditingCategory}
          categoryForm={categoryForm}
          setCategoryForm={setCategoryForm}
          allGroups={allGroups}
          handleCreateCategory={handleCreateCategory}
          handleUpdateCategory={handleUpdateCategory}
        />

        {/* ── Group Dialogs ── */}
        <GroupDialogs
          showGroupDialog={showGroupDialog}
          setShowGroupDialog={setShowGroupDialog}
          editingGroup={editingGroup}
          setEditingGroup={setEditingGroup}
          groupForm={groupForm}
          setGroupForm={setGroupForm}
          handleCreateGroup={handleCreateGroup}
          handleUpdateGroup={handleUpdateGroup}
        />
      </div>
    </AppLayout>
  );
}
