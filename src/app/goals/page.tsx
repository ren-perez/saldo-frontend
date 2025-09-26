"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { NotebookText, Plus, Target } from "lucide-react"
import { GoalDialog } from "@/components/goals/GoalDialog"
import { GoalFilters } from "@/components/goals/GoalFilters"
import { GoalCardItem } from "@/components/goals/GoalCardItem"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { Goal, FilterOptions, Filters } from "@/types/goals"

export default function GoalsPage() {
  const { convexUser } = useConvexUser()
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [filters, setFilters] = useState<Filters>({
    account_id: "",
    status: "",
    search: ""
  })

  // Fetch goals data
  const goals = useQuery(
    convexUser ? api.goals.getGoals : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) || []
  
  const filterOptions = useQuery(
    convexUser ? api.goals.getFilterOptions : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) || { accounts: [] }

  // Mutations
  const createGoal = useMutation(api.goals.createGoal)
  const updateGoal = useMutation(api.goals.updateGoal)

  // Loading state
  const isLoading = goals === undefined || filterOptions === undefined

  // Currency formatter
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Date formatter
  const formatDate = (dateString?: string): string | null => {
    if (!dateString) return null
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(dateString))
  }

  // Progress percentage calculator
  const getProgressPercentage = (current: number, target: number): number => {
    if (target <= 0) return 0
    return Math.min(Math.round((current / target) * 100), 100)
  }

  const handleCreateGoal = async (goalData: Goal) => {
    // Goal data already contains userId from GoalDialog
    console.log('Goal created:', goalData)
  }

  const handleUpdateGoal = async (goalData: Goal) => {
    // Goal data already contains userId from GoalDialog
    console.log('Goal updated:', goalData)
  }

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setShowGoalDialog(true)
  }

  const handleCreateNewGoal = () => {
    setEditingGoal(null)
    setShowGoalDialog(true)
  }

  const handleDialogClose = () => {
    setShowGoalDialog(false)
    setEditingGoal(null)
  }

  // Filter goals based on current filters
  const filteredGoals = goals.filter((goal: Goal) => {
    if (filters.search && !goal.name.toLowerCase().includes(filters.search.toLowerCase())) {
      return false
    }
    if (filters.account_id && filters.account_id !== "__all__" && goal.linked_account_id !== filters.account_id) {
      return false
    }
    return true
  })

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
            <div className="h-4 w-96 bg-muted rounded animate-pulse"></div>
          </div>
          <div className="h-10 w-32 bg-muted rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-0">
                <div className="h-48 bg-muted animate-pulse"></div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-3/4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
                  <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <AppLayout>
      <InitUser />
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Target className="h-8 w-8 text-primary" />
              Goals
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your financial goals and stay motivated on your journey
            </p>
          </div>

          <Button onClick={handleCreateNewGoal} className="gap-2">
            <Plus className="h-4 w-4" />
            New Goal
          </Button>
        </div>

        {/* Filters */}
        <GoalFilters
          filters={filters}
          onFiltersChange={setFilters}
          filterOptions={filterOptions}
        />

        {/* Goals Grid */}
        {filteredGoals.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <Target className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No goals found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {goals.length === 0
                ? "Start your financial journey by creating your first goal. Set targets, track progress, and achieve your dreams!"
                : "No goals match your current filters. Try adjusting your search criteria or clearing the filters."
              }
            </p>
            {goals.length === 0 && (
              <Button onClick={handleCreateNewGoal} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Goal
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGoals.map((goal: Goal) => (
              <GoalCardItem
                key={goal.id}
                goal={goal}
                onEditGoal={handleEditGoal}
                formatCurrency={formatCurrency}
                formatDate={formatDate}
                getProgressPercentage={getProgressPercentage}
              />
            ))}
          </div>
        )}

        {/* Goal Dialog */}
        <GoalDialog
          open={showGoalDialog}
          onOpenChange={handleDialogClose}
          onCreateGoal={handleCreateGoal}
          onUpdateGoal={handleUpdateGoal}
          editingGoal={editingGoal}
          mode={editingGoal ? "edit" : "create"}
        />
      </div>
    </AppLayout>
  )
}