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

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Tag,
  FolderOpen,
  ChevronsUpDown,
  Zap,
  Lightbulb,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import { Category, CategoryGroup, CategoryRule } from "./types";
import { GroupSection } from "./_components/GroupSection";
import { RuleRow } from "./_components/RuleRow";
import { CategoryDialogs } from "./_components/CategoryDialogs";
import { GroupDialogs } from "./_components/GroupDialogs";

// ─── split add button ────────────────────────────────────────────────────────

function AddCategoryButton({
  onAddCategory,
  onAddGroup,
}: {
  onAddCategory: () => void;
  onAddGroup: () => void;
}) {
  return (
    <div className="flex items-center">
      <Button
        className="gap-2 rounded-r-none border-r border-primary-foreground/20"
        onClick={onAddCategory}
      >
        <Plus className="size-4" />
        Add category
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="rounded-l-none px-2.5">
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onAddGroup} className="gap-2">
            <FolderOpen className="size-3.5" />
            Add group
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

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
  const [ruleDialogState, setRuleDialogState] = useState<RuleDialogMode | null>(null);

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingGroup, setEditingGroup] = useState<CategoryGroup | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    groupId: "",
    transactionType: "",
  });

  const [groupForm, setGroupForm] = useState({ name: "" });
  const [suggestionsOpen, setSuggestionsOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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
          <p className="text-sm text-muted-foreground">Sign in required</p>
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

  // ── derived data ──
  const allCategories = [...(categories ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const allGroups = [...(categoryGroups ?? [])].sort((a, b) => a.name.localeCompare(b.name));

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

  const categoryNameMap = new Map(allCategories.map((c) => [c._id as string, c.name]));
  const isLoading = categories === undefined || categoryGroups === undefined;
  const hasContent = allCategories.length > 0 || allGroups.length > 0;
  const activeRules = (rules ?? []).filter((r) => r.isActive);
  const inactiveRules = (rules ?? []).filter((r) => !r.isActive);

  return (
    <AppLayout>
      <InitUser />
      <div className="container flex flex-col">
        <div className="flex flex-col gap-6 p-6">

          <Tabs defaultValue="categories" onValueChange={setActiveTab}>
            <div className="flex items-center mb-6">
              <TabsList>
                <TabsTrigger value="categories" className="gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Categories
                </TabsTrigger>
                <TabsTrigger value="rules" className="gap-2">
                  <Zap className="h-3.5 w-3.5" />
                  Auto-rules
                </TabsTrigger>
              </TabsList>

              {/* Per-tab CTAs */}
              <div className="ml-auto flex items-center gap-2">
                {activeTab === "categories" ? (
                  <AddCategoryButton
                    onAddCategory={() => setShowCategoryDialog(true)}
                    onAddGroup={() => setShowGroupDialog(true)}
                  />
                ) : (
                  <Button
                    onClick={() => setRuleDialogState({ type: "new" })}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add rule
                  </Button>
                )}
              </div>
            </div>

            {/* ══ Categories tab ══ */}
            <TabsContent value="categories">
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
                  ))}
                </div>
              ) : !hasContent ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Tag className="size-8 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium">No categories yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                      Create groups to organise your categories, then add categories to track your transactions.
                    </p>
                  </div>
                  <div className="mt-2">
                    <AddCategoryButton
                      onAddCategory={() => setShowCategoryDialog(true)}
                      onAddGroup={() => setShowGroupDialog(true)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* Groups list header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Groups</span>
                      <span className="text-xs text-muted-foreground/50">
                        ({allGroups.length + (ungrouped.length > 0 ? 1 : 0)})
                      </span>
                    </div>
                    {/* <span className="flex-1 h-px bg-border" /> */}
                    <button
                      onClick={toggleAll}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronsUpDown className="h-3.5 w-3.5" />
                      {allExpanded ? "Collapse all" : "Expand all"}
                    </button>
                  </div>

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
                      {allGroups.length > 0 && <div className="h-px bg-border my-1" />}
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
              ) : rules.length === 0 && (!suggestions || suggestions.length === 0) ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                  <Zap className="size-8 text-muted-foreground/30" />
                  <div>
                    <p className="text-sm font-medium">No auto-rules yet</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
                      Rules automatically categorise new transactions when their description contains a keyword you define.
                    </p>
                  </div>
                  <Button
                    onClick={() => setRuleDialogState({ type: "new" })}
                    className="gap-2 mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add rule
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-8">

                  {/* Suggested rules */}
                  {suggestions && suggestions.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <button
                        className="flex w-full items-center gap-2 select-none"
                        onClick={() => setSuggestionsOpen((p) => !p)}
                      >
                        <Lightbulb className="size-3.5 text-yellow-500" />
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Suggested rules
                        </span>
                        <span className="text-xs text-muted-foreground/50">({suggestions.length})</span>
                        <span className="flex-1 h-px bg-border" />
                        <ChevronRight
                          className={`size-3.5 text-muted-foreground/50 transition-transform duration-200 ${suggestionsOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                      {suggestionsOpen && (
                        <div className="flex flex-col gap-2">
                          {suggestions.map((s, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/60 bg-card"
                            >
                              <div className="flex items-center gap-3 min-w-0">
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
                                Create rule
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
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Active rules
                          </span>
                          <span className="text-xs text-muted-foreground/50">({activeRules.length})</span>
                          <span className="flex-1 h-px bg-border" />
                          <span className="text-xs text-muted-foreground">drag to reorder</span>
                        </div>
                        <div className="flex flex-col gap-1">
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

                    {/* Paused rules */}
                    {inactiveRules.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Zap className="size-3.5 text-muted-foreground/30" />
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Paused rules
                          </span>
                          <span className="text-xs text-muted-foreground/50">({inactiveRules.length})</span>
                          <span className="flex-1 h-px bg-border" />
                        </div>
                        <div className="flex flex-col gap-1">
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

                  <p className="text-xs text-muted-foreground">
                    Rules are checked in priority order (top first). Drag rows to reorder.
                    Manual overrides always take precedence.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Rule dialog */}
          {ruleDialogState && convexUser && (
            <RulePreviewDialog
              mode={ruleDialogState}
              userId={convexUser._id}
              categories={allCategories}
              onClose={() => setRuleDialogState(null)}
            />
          )}

          {/* Category dialogs */}
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

          {/* Group dialogs */}
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
      </div>
    </AppLayout>
  );
}
