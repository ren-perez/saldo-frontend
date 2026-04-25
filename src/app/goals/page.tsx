"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { useConvexUser } from "@/hooks/useConvexUser"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Plus, Target, Trophy, Info, Loader, ChevronDown, ChevronUp } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { GoalDialog } from "@/components/goals/GoalDialog"
import { GoalCardItem } from "@/components/goals/GoalCardItem"
import { AchievementCard } from "@/components/goals/AchievementCard"
import { GoalCompletedDialog } from "@/components/goals/GoalCompletedDialog"
import AppLayout from "@/components/AppLayout"
import InitUser from "@/components/InitUser"
import { Goal, Filters } from "@/types/goals"

export default function GoalsPage() {
  const { convexUser } = useConvexUser()
  const [showGoalDialog, setShowGoalDialog] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [celebratingGoal, setCelebratingGoal] = useState<Goal | null>(null)
  const [filters] = useState<Filters>({
    account_id: "",
    status: "",
    search: ""
  })
  const [achievementsOpen, setAchievementsOpen] = useState(false)
  const [inProgressOpen, setInProgressOpen] = useState(true)
  const achievementsInitialized = useRef(false)

  // Fetch goals data
  const rawGoals = useQuery(
    convexUser ? api.goals.getGoals : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  )
  const goals = rawGoals || []

  const filterOptions = useQuery(
    convexUser ? api.goals.getFilterOptions : ("skip" as never),
    convexUser ? { userId: convexUser._id } : "skip"
  ) || { accounts: [] }

  // Loading state
  const isLoading = rawGoals === undefined || filterOptions === undefined

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
    console.log('Goal created:', goalData)
  }

  const handleUpdateGoal = async (goalData: Goal) => {
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

  const activeGoals = filteredGoals.filter((g: Goal) => !g.is_completed)
  const achievedGoals = filteredGoals.filter((g: Goal) => g.is_completed)

  // Set achievements default open state once data loads: open only if there are achievements
  useEffect(() => {
    if (rawGoals !== undefined && !achievementsInitialized.current) {
      achievementsInitialized.current = true
      setAchievementsOpen(achievedGoals.length > 0)
    }
  }, [rawGoals, achievedGoals.length])

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
      <div className="container mx-auto py-6 px-6">
        <div className="mb-6 text-right">
          <Button onClick={handleCreateNewGoal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Goal
          </Button>
        </div>

        {/* Achievements Section */}
        <div className="mb-10">
          <button
            onClick={() => setAchievementsOpen(!achievementsOpen)}
            className="flex items-center gap-2 mb-4 w-full text-left group"
          >
            <Trophy className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold">Achievements</h2>
            {achievedGoals.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({achievedGoals.length})
              </span>
            )}
            <Separator className="flex-1" />
            {achievementsOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
            }
          </button>
          <div className={`grid transition-all duration-300 ease-in-out ${achievementsOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              {achievedGoals.length > 0 ? (
                <div className="flex flex-wrap gap-3 pb-1">
                  {achievedGoals.map((goal: Goal) => (
                    <AchievementCard
                      key={goal._id}
                      goal={goal}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-muted-foreground/25 py-8 px-6 text-center">
                  <Trophy className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No achievements yet. Complete a goal to earn your first trophy!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* In Progress Section */}
        {activeGoals.length === 0 && achievedGoals.length === 0 ? (
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
          <div>
            <button
              onClick={() => setInProgressOpen(!inProgressOpen)}
              className="flex items-center gap-3 w-full text-left mb-4"
            >
              <Loader className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">In progress</h2>
              {activeGoals.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  ({activeGoals.length})
                </span>
              )}
              <Separator className="flex-1" />
              {inProgressOpen
                ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              }
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${inProgressOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
              <div className="overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-1">
                  {activeGoals.map((goal: Goal) => (
                    <GoalCardItem
                      key={goal._id}
                      goal={goal}
                      onEditGoal={handleEditGoal}
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      getProgressPercentage={getProgressPercentage}
                      onGoalCompleted={setCelebratingGoal}
                    />
                  ))}
                </div>
              </div>
            </div>
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

        {/* Celebration Dialog — lives at page level so it survives goal re-render */}
        {celebratingGoal && (
          <GoalCompletedDialog
            goal={celebratingGoal}
            open={!!celebratingGoal}
            onOpenChange={(open) => { if (!open) setCelebratingGoal(null) }}
            formatCurrency={formatCurrency}
          />
        )}
      </div>
    </AppLayout>
  )
}
