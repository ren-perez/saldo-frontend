"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Id } from "../../../convex/_generated/dataModel";

import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ChevronDown, Tag, FolderOpen } from "lucide-react";

export default function CategoriesPage() {
  const { convexUser } = useConvexUser();

  // Queries
  const categories = useQuery(
    convexUser ? api.categories.listCategories : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const categoryGroups = useQuery(
    convexUser ? api.categoryGroups.listCategoryGroups : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Mutations
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const createCategoryGroup = useMutation(api.categoryGroups.createCategoryGroup);
  const updateCategoryGroup = useMutation(api.categoryGroups.updateCategoryGroup);
  const deleteCategoryGroup = useMutation(api.categoryGroups.deleteCategoryGroup);

  // Dialog states
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    groupId: "" as string,
    transactionType: "" as string,
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
  });

  // Edit states
  const [editingCategory, setEditingCategory] = useState<{
    _id: Id<"categories">;
    name: string;
    groupId?: Id<"category_groups">;
    transactionType?: string;
  } | null>(null);

  const [editingGroup, setEditingGroup] = useState<{
    _id: Id<"category_groups">;
    name: string;
  } | null>(null);

  if (!convexUser) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-lg">Sign in required</p>
        </div>
      </AppLayout>
    );
  }

  // Helpers
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

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    await createCategoryGroup({
      userId: convexUser._id,
      name: groupForm.name,
    });

    setGroupForm({ name: "" });
    setShowGroupDialog(false);
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

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    await updateCategoryGroup({
      groupId: editingGroup._id,
      updates: {
        name: editingGroup.name,
      },
    });

    setEditingGroup(null);
  };

  const handleDeleteCategory = async (categoryId: Id<"categories">) => {
    if (confirm("Delete this category?")) {
      await deleteCategory({ categoryId });
    }
  };

  const handleDeleteGroup = async (groupId: Id<"category_groups">) => {
    const groupCategories =
      categories?.filter((cat) => cat.groupId === groupId) || [];
    if (groupCategories.length > 0) {
      alert("Cannot delete group with categories. Move or delete them first.");
      return;
    }

    if (confirm("Delete this group?")) {
      await deleteCategoryGroup({ groupId });
    }
  };

  const getGroupName = (groupId?: Id<"category_groups">) => {
    if (!groupId) return "No Group";
    const group = categoryGroups?.find((g) => g._id === groupId);
    return group?.name || "Unknown Group";
  };

  const getTransactionTypeDisplay = (transactionType?: string) => {
    switch (transactionType) {
      case "income": return "Income";
      case "expense": return "Expense";
      case "transfer": return "Transfer";
      default: return "No Type";
    }
  };

  return (
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Categories & Groups</h1>
            <p className="text-muted-foreground">
              Organize your transaction categories
            </p>
          </div>

          {/* Combined New dropdown - Category as default */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowCategoryDialog(true)} className="gap-2">
                <Tag className="h-4 w-4" />
                New Category
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowGroupDialog(true)} className="gap-2">
                <FolderOpen className="h-4 w-4" />
                New Group
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="groups">Groups</TabsTrigger>
          </TabsList>

          {/* Categories */}
          <TabsContent value="categories">
            <Card>
              <CardContent className="pt-6">
                {!categories || categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm mb-1">No categories yet</p>
                    <p className="text-xs mb-4">Create your first category to organize transactions</p>
                    <Button size="sm" variant="outline" onClick={() => setShowCategoryDialog(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      New Category
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <div key={cat._id}>
                        {editingCategory?._id === cat._id ? (
                          <form
                            onSubmit={handleUpdateCategory}
                            className="p-3 border rounded-md bg-accent/30 space-y-2"
                          >
                            <Input
                              value={editingCategory.name}
                              onChange={(e) =>
                                setEditingCategory((p) => p ? ({
                                  ...p,
                                  name: e.target.value,
                                }) : null)
                              }
                              required
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <Select
                                value={editingCategory.transactionType || "none"}
                                onValueChange={(val) =>
                                  setEditingCategory((p) => p ? ({
                                    ...p,
                                    transactionType: val === "none" ? undefined : val,
                                  }) : null)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Transaction Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Type</SelectItem>
                                  <SelectItem value="income">Income</SelectItem>
                                  <SelectItem value="expense">Expense</SelectItem>
                                  <SelectItem value="transfer">Transfer</SelectItem>
                                </SelectContent>
                              </Select>
                              <Select
                                value={editingCategory.groupId || "none"}
                                onValueChange={(val) =>
                                  setEditingCategory((p) => p ? ({
                                    ...p,
                                    groupId: val === "none" ? undefined : (val as Id<"category_groups">),
                                  }) : null)
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="No Group" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No Group</SelectItem>
                                  {categoryGroups?.map((g) => (
                                    <SelectItem key={g._id} value={g._id}>
                                      {g.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" size="sm">
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingCategory(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors">
                            <div>
                              <div className="font-medium text-sm">{cat.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {getTransactionTypeDisplay(cat.transactionType)} &middot; {getGroupName(cat.groupId)}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setEditingCategory(cat)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                onClick={() => handleDeleteCategory(cat._id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Groups */}
          <TabsContent value="groups">
            <Card>
              <CardContent className="pt-6">
                {!categoryGroups || categoryGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FolderOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-sm mb-1">No groups yet</p>
                    <p className="text-xs mb-4">Create groups to organize your categories</p>
                    <Button size="sm" variant="outline" onClick={() => setShowGroupDialog(true)} className="gap-1.5">
                      <Plus className="h-3.5 w-3.5" />
                      New Group
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categoryGroups.map((g) => {
                      const gCats =
                        categories?.filter((c) => c.groupId === g._id) || [];
                      return (
                        <div key={g._id}>
                          {editingGroup?._id === g._id ? (
                            <form
                              onSubmit={handleUpdateGroup}
                              className="p-3 border rounded-md bg-accent/30 space-y-2"
                            >
                              <Input
                                value={editingGroup.name}
                                onChange={(e) =>
                                  setEditingGroup((p) => p ? ({
                                    ...p,
                                    name: e.target.value,
                                  }) : null)
                                }
                                required
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm">
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEditingGroup(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between rounded-md border p-3 hover:bg-accent/50 transition-colors">
                              <div>
                                <div className="font-medium text-sm">{g.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {gCats.length} {gCats.length === 1 ? "category" : "categories"}
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => setEditingGroup(g)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                  onClick={() => handleDeleteGroup(g._id)}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Create Category Dialog */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your transactions.
              </DialogDescription>
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
                      {categoryGroups?.map((g) => (
                        <SelectItem key={g._id} value={g._id}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCategoryDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Category</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Group Dialog */}
        <Dialog open={showGroupDialog} onOpenChange={setShowGroupDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize related categories.
              </DialogDescription>
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
                <Button type="button" variant="outline" onClick={() => setShowGroupDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Group</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
