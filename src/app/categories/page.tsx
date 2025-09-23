"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useConvexUser } from "@/hooks/useConvexUser";
import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import InitUser from "@/components/InitUser";
import { Id } from "../../../convex/_generated/dataModel";

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
        groupId: "" as string
    });

    const [groupForm, setGroupForm] = useState({
        name: ""
    });

    // Edit states
    const [editingCategory, setEditingCategory] = useState<any>(null);
    const [editingGroup, setEditingGroup] = useState<any>(null);

    // Active tab
    const [activeTab, setActiveTab] = useState("categories");

    if (!convexUser) {
        return (
            <AppLayout>
                <div className="flex items-center justify-center h-64">
                    <p className="text-lg">Sign in required</p>
                </div>
            </AppLayout>
        );
    }

    // Helper functions
    const handleCreateCategory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!categoryForm.name.trim()) return;

        await createCategory({
            userId: convexUser._id,
            name: categoryForm.name,
            groupId: categoryForm.groupId ? categoryForm.groupId as Id<"category_groups"> : undefined,
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
            }
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
            }
        });

        setEditingGroup(null);
    };

    const handleDeleteCategory = async (categoryId: Id<"categories">) => {
        if (confirm("Are you sure you want to delete this category?")) {
            await deleteCategory({ categoryId });
        }
    };

    const handleDeleteGroup = async (groupId: Id<"category_groups">) => {
        // Check if group has categories
        const groupCategories = categories?.filter(cat => cat.groupId === groupId) || [];
        if (groupCategories.length > 0) {
            alert("Cannot delete group with categories. Move or delete categories first.");
            return;
        }

        if (confirm("Are you sure you want to delete this group?")) {
            await deleteCategoryGroup({ groupId });
        }
    };

    const getGroupName = (groupId?: Id<"category_groups">) => {
        if (!groupId) return "No Group";
        const group = categoryGroups?.find(g => g._id === groupId);
        return group?.name || "Unknown Group";
    };

    return (
        <AppLayout>
            <InitUser />
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Categories & Groups</h1>
                    <p className="text-gray-600">Organize your transaction categories</p>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab("categories")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "categories"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            🏷️ Categories
                        </button>
                        <button
                            onClick={() => setActiveTab("groups")}
                            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === "groups"
                                    ? "border-blue-500 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                }`}
                        >
                            📁 Category Groups
                        </button>
                    </nav>
                </div>

                {/* Categories Tab */}
                {activeTab === "categories" && (
                    <div className="space-y-8">
                        {/* Create Category Form */}
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h2>
                            <form onSubmit={handleCreateCategory} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Category Name
                                        </label>
                                        <input
                                            value={categoryForm.name}
                                            onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="e.g., Groceries, Gas, Entertainment"
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Category Group (optional)
                                        </label>
                                        <select
                                            value={categoryForm.groupId}
                                            onChange={e => setCategoryForm(prev => ({ ...prev, groupId: e.target.value }))}
                                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">No Group</option>
                                            {categoryGroups?.map(group => (
                                                <option key={group._id} value={group._id}>
                                                    {group.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 hover:cursor-pointer text-white px-4 py-2 rounded-md font-medium"
                                >
                                    Add Category
                                </button>
                            </form>
                        </div>

                        {/* Categories List */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Your Categories</h2>
                            </div>
                            <div className="p-6">
                                {(!categories || categories.length === 0) ? (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-4">🏷️</div>
                                        <p className="text-gray-500 mb-4">No categories yet</p>
                                        <p className="text-sm text-gray-400">Add your first category above to get started</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {categories.map(category => (
                                            <div key={category._id}>
                                                {editingCategory?._id === category._id ? (
                                                    <form onSubmit={handleUpdateCategory} className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Category Name
                                                                </label>
                                                                <input
                                                                    value={editingCategory.name}
                                                                    onChange={e => setEditingCategory(prev => ({ ...prev, name: e.target.value }))}
                                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Category Group
                                                                </label>
                                                                <select
                                                                    value={editingCategory.groupId || ""}
                                                                    onChange={e => setEditingCategory(prev => ({
                                                                        ...prev,
                                                                        groupId: e.target.value || undefined
                                                                    }))}
                                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                                >
                                                                    <option value="">No Group</option>
                                                                    {categoryGroups?.map(group => (
                                                                        <option key={group._id} value={group._id}>
                                                                            {group.name}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                type="submit"
                                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium"
                                                            >
                                                                💾 Save
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingCategory(null)}
                                                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium"
                                                            >
                                                                ❌ Cancel
                                                            </button>
                                                        </div>
                                                    </form>
                                                ) : (
                                                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:cursor-pointer">
                                                        <div>
                                                            <div className="font-medium text-gray-900">
                                                                {category.name}
                                                            </div>
                                                            <div className="text-sm text-gray-500">
                                                                Group: {getGroupName(category.groupId)}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <button
                                                                onClick={() => setEditingCategory(category)}
                                                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteCategory(category._id)}
                                                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Groups Tab */}
                {activeTab === "groups" && (
                    <div className="space-y-8">
                        {/* Create Group Form */}
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Add New Group</h2>
                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div className="max-w-md">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Group Name
                                    </label>
                                    <input
                                        value={groupForm.name}
                                        onChange={e => setGroupForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g., Food & Dining, Transportation, Bills"
                                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 hover:cursor-pointer text-white px-4 py-2 rounded-md font-medium"
                                >
                                    Add Group
                                </button>
                            </form>
                        </div>

                        {/* Groups List */}
                        <div className="bg-white rounded-lg shadow-sm border">
                            <div className="px-6 py-4 border-b border-gray-200">
                                <h2 className="text-lg font-medium text-gray-900">Your Groups</h2>
                            </div>
                            <div className="p-6">
                                {(!categoryGroups || categoryGroups.length === 0) ? (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-4">📁</div>
                                        <p className="text-gray-500 mb-4">No groups yet</p>
                                        <p className="text-sm text-gray-400">Add your first group above to organize categories</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {categoryGroups.map(group => {
                                            const groupCategories = categories?.filter(cat => cat.groupId === group._id) || [];

                                            return (
                                                <div key={group._id}>
                                                    {editingGroup?._id === group._id ? (
                                                        <form onSubmit={handleUpdateGroup} className="p-4 border border-green-200 rounded-lg bg-green-50">
                                                            <div className="max-w-md mb-4">
                                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                    Group Name
                                                                </label>
                                                                <input
                                                                    value={editingGroup.name}
                                                                    onChange={e => setEditingGroup(prev => ({ ...prev, name: e.target.value }))}
                                                                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                                    required
                                                                />
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    type="submit"
                                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                                                                >
                                                                    💾 Save
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setEditingGroup(null)}
                                                                    className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium"
                                                                >
                                                                    ❌ Cancel
                                                                </button>
                                                            </div>
                                                        </form>
                                                    ) : (
                                                        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:cursor-pointer">
                                                            <div>
                                                                <div className="font-medium text-gray-900">
                                                                    📁 {group.name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">
                                                                    {groupCategories.length} categories
                                                                </div>
                                                                {groupCategories.length > 0 && (
                                                                    <div className="text-xs text-gray-400 mt-1">
                                                                        {groupCategories.map(cat => cat.name).join(", ")}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                <button
                                                                    onClick={() => setEditingGroup(group)}
                                                                    className="text-green-600 hover:text-green-700 text-sm font-medium"
                                                                >
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteGroup(group._id)}
                                                                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}