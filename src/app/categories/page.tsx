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
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function CategoriesPage() {
  const { convexUser } = useConvexUser();

  // Queries
  const categories = useQuery(
    convexUser ? api.categories.listCategories : "skip" as any,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  const categoryGroups = useQuery(
    convexUser ? api.categoryGroups.listCategoryGroups : "skip" as any,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  // Mutations
  const createCategory = useMutation(api.categories.createCategory);
  const updateCategory = useMutation(api.categories.updateCategory);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const createCategoryGroup = useMutation(api.categoryGroups.createCategoryGroup);
  const updateCategoryGroup = useMutation(api.categoryGroups.updateCategoryGroup);
  const deleteCategoryGroup = useMutation(api.categoryGroups.deleteCategoryGroup);

  // Form states
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    groupId: "" as string,
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
  });

  // Edit states
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingGroup, setEditingGroup] = useState<any>(null);

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
    });

    setCategoryForm({ name: "", groupId: "" });
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;

    await createCategoryGroup({
      userId: convexUser._id,
      name: groupForm.name,
    });

    setGroupForm({ name: "" });
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;

    await updateCategory({
      categoryId: editingCategory._id,
      updates: {
        name: editingCategory.name,
        groupId: editingCategory.groupId || undefined,
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

  return (
    <AppLayout>
      <InitUser />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Categories & Groups</h1>
          <p className="text-muted-foreground">
            Organize your transaction categories
          </p>
        </div>

        <Tabs defaultValue="categories" className="w-full">
          <TabsList>
            <TabsTrigger value="categories">🏷️ Categories</TabsTrigger>
            <TabsTrigger value="groups">📁 Category Groups</TabsTrigger>
          </TabsList>

          {/* Categories */}
          <TabsContent value="categories">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Category</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCategory} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      value={categoryForm.name}
                      onChange={(e) =>
                        setCategoryForm((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="e.g., Groceries, Gas"
                      required
                    />
                    <Select
                      value={categoryForm.groupId}
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
                  <Button type="submit">Add Category</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {!categories || categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">🏷️</div>
                    No categories yet
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
                                setEditingCategory((p: any) => ({
                                  ...p,
                                  name: e.target.value,
                                }))
                              }
                              required
                            />
                            <Select
                              value={editingCategory.groupId || "none"}
                              onValueChange={(val) =>
                                setEditingCategory((p: any) => ({
                                  ...p,
                                  groupId: val === "none" ? undefined : val,
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
                            <div className="flex gap-2">
                              <Button type="submit" size="sm">
                                💾 Save
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setEditingCategory(null)}
                              >
                                ❌ Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
                            <div>
                              <div className="font-medium">{cat.name}</div>
                              <div className="text-sm text-muted-foreground">
                                Group: {getGroupName(cat.groupId)}
                              </div>
                            </div>
                            <div className="space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingCategory(cat)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
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
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Add New Group</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <Input
                    value={groupForm.name}
                    onChange={(e) =>
                      setGroupForm((p) => ({ ...p, name: e.target.value }))
                    }
                    placeholder="e.g., Bills, Food & Dining"
                    required
                  />
                  <Button type="submit" variant="success">
                    Add Group
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Your Groups</CardTitle>
              </CardHeader>
              <CardContent>
                {!categoryGroups || categoryGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-4xl mb-2">📁</div>
                    No groups yet
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
                                  setEditingGroup((p: any) => ({
                                    ...p,
                                    name: e.target.value,
                                  }))
                                }
                                required
                              />
                              <div className="flex gap-2">
                                <Button type="submit" size="sm">
                                  💾 Save
                                </Button>
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setEditingGroup(null)}
                                >
                                  ❌ Cancel
                                </Button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between rounded-md border p-3 hover:bg-accent">
                              <div>
                                <div className="font-medium">📁 {g.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {gCats.length} categories
                                </div>
                              </div>
                              <div className="space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingGroup(g)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
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
      </div>
    </AppLayout>
  );
}
