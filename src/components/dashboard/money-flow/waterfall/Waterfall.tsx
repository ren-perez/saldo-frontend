"use client"

import { cn } from "@/lib/utils"
import { currencyExact } from "@/lib/format"
import { compactCurrency } from "../shared/hierarchy-utils"
import { INCOME_COLOR } from "../shared/flow-colors"
import type { FlowHierarchyNode } from "../shared/types"
import { WaterfallRow } from "./WaterfallRow"
import { WaterfallTransactions } from "./WaterfallTransactions"
import { WaterfallAllocations } from "./WaterfallAllocations"

interface WaterfallProps {
  incomeNode: FlowHierarchyNode
  flowNodes: FlowHierarchyNode[]
  totalIncome: number
  runningRemainder: number
  matchedTotal: number
  plannedTotal: number
  expectedTotal: number
}

function renderFlowNode(node: FlowHierarchyNode, depth: number): React.ReactNode {
  if (node.kind === "category") {
    return (
      <WaterfallRow
        key={node.id}
        nodeId={node.id}
        label={node.label}
        amount={node.amount}
        color={node.color}
        type="minus"
        hasChildren={(node.transactions?.length ?? 0) > 0}
        depth={depth}
        parentAmount={undefined}
      >
        {node.transactions && node.transactions.length > 0 && (
          <WaterfallTransactions transactions={node.transactions} depth={0} type="expense" />
        )}
      </WaterfallRow>
    )
  }

  if (node.kind === "group") {
    return (
      <WaterfallRow
        key={node.id}
        nodeId={node.id}
        label={node.label}
        amount={node.amount}
        color={node.color}
        type="minus"
        hasChildren={node.children.length > 0}
        depth={depth}
        parentAmount={undefined}
      >
        {node.children.map((child) => renderFlowNode(child, 0))}
      </WaterfallRow>
    )
  }

  if (node.kind === "flow-class") {
    return (
      <WaterfallRow
        key={node.id}
        nodeId={node.id}
        label={node.label}
        amount={node.amount}
        color={node.color}
        type="minus"
        hasChildren={node.children.length > 0}
        depth={depth}
        parentAmount={undefined}
      >
        {node.children.map((child) => renderFlowNode(child, 0))}
      </WaterfallRow>
    )
  }

  return null
}

export function Waterfall({ incomeNode, flowNodes, totalIncome, runningRemainder, matchedTotal, plannedTotal, expectedTotal }: WaterfallProps) {
  return (
    <>
      <div className="cc-waterfall-scroll flex-1 overflow-y-auto px-3 pb-2 max-h-[400px] flex flex-col gap-0.5">
        {/* Income root row */}
        <WaterfallRow
          nodeId="income"
          label="Income"
          amount={totalIncome}
          color={INCOME_COLOR}
          type="plus"
          hasChildren={incomeNode.children.length > 0 || (incomeNode.transactions?.length ?? 0) > 0}
          depth={0}
          endSlot={
            <span className="flex items-center gap-1 text-[10px] tabular-nums ml-1">
              <span className="flex items-center gap-0.5 text-muted-foreground/60" title="Expected">
                <span className="size-1.5 rounded-full bg-muted-foreground/40" />
                {compactCurrency(expectedTotal)}
              </span>
              <span className="flex items-center gap-0.5 text-amber-500/80" title="Planned">
                <span className="size-1.5 rounded-full bg-amber-500/70" />
                {compactCurrency(plannedTotal)}
              </span>
              <span className="flex items-center gap-0.5 text-emerald-500/80" title="Matched">
                <span className="size-1.5 rounded-full bg-emerald-500/70" />
                {compactCurrency(matchedTotal)}
              </span>
            </span>
          }
        >
          {/* Income plan children */}
          {incomeNode.children.map((plan) => {
            const hasPlanChildren = plan.status === "matched" || plan.status === "completed"
            return (
              <WaterfallRow
                key={plan.id}
                nodeId={plan.id}
                label={plan.label}
                amount={plan.amount}
                color={INCOME_COLOR}
                type="plus"
                hasChildren={hasPlanChildren}
                depth={0}
                parentAmount={totalIncome}
              >
                {plan.incomePlanId && (
                  <>
                    <WaterfallAllocations incomePlanId={plan.incomePlanId} />
                    {plan.expectedDate && (
                      <div className="flex items-center gap-2 px-1 pb-1 text-[10px] text-muted-foreground/60">
                        <span>{plan.expectedDate}</span>
                        {plan.recurrence && plan.recurrence !== "once" && (
                          <span className="capitalize">{plan.recurrence}</span>
                        )}
                      </div>
                    )}
                  </>
                )}
              </WaterfallRow>
            )
          })}
          {/* Income transactions */}
          {(incomeNode.transactions?.length ?? 0) > 0 && (
            <WaterfallTransactions transactions={incomeNode.transactions!} depth={0} type="income" />
          )}
        </WaterfallRow>

        {/* Flow class rows */}
        {flowNodes.map((node) => renderFlowNode(node, 0))}
      </div>

      {/* Footer */}
      <div className="cc-waterfall-footer border-t border-border mx-3 py-2.5 flex justify-between items-center">
        <span className="text-xs font-medium text-muted-foreground">Flow remainder</span>
        <span className={cn("text-sm font-bold tabular-nums", runningRemainder >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
          {runningRemainder >= 0 ? "+" : "−"}{currencyExact(Math.abs(runningRemainder))}
        </span>
      </div>
    </>
  )
}
