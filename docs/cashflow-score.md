# Cashflow Score

The Cashflow Score is a composite metric that evaluates overall financial health by balancing surplus income, expense efficiency, and proactive saving habits. It provides a single numerical score (0-99) to help users quickly assess their financial discipline and identify areas for improvement.

## Calculation

The score is computed from three weighted components:

### 1. Unallocated Income Percentage (40% weight)
- **Formula**: `(income - expenses - goals) / income` (capped at 100%)
- **Purpose**: Measures the portion of income left after covering expenses and goals
- **Impact**: Higher unallocated percentage directly increases the score

### 2. Expense Load Efficiency (40% weight)
- **Formula**: `1 - (expenses / income)` (inverted so lower expense ratios score higher)
- **Purpose**: Rewards keeping expenses under control (ideally below 70% of income)
- **Impact**: Lower expense-to-income ratios improve the score

### 3. Roth Automation Bonus (20% weight)
- **Formula**: Binary bonus if a Roth/retirement goal has automated monthly contributions > 0
- **Purpose**: Encourages passive, disciplined saving habits
- **Impact**: Adds 20 points for having automated retirement contributions

### Final Score
```javascript
rawScore = (unallocatedPct/100 * 40) + ((1 - expenseLoadPct/100) * 40) + (rothAutomated ? 20 : 0)
cashflowScore = Math.min(99, Math.max(0, Math.round(rawScore)))
```

## Score Ranges and Tones

| Range | Tone | Interpretation |
|-------|------|----------------|
| 80-99 | Green | Excellent financial health with strong surplus and discipline |
| 60-79 | Blue | Good balance with room for optimization |
| 40-59 | Amber | Moderate concerns; review expense control or automation |
| 0-39 | Red | Significant challenges; focus on reducing expenses or increasing income |

## Interpretation Guidelines

- **High scores (80+)**: Indicates healthy surplus, efficient spending, and automated saving
- **Medium scores (40-79)**: Suggests balanced finances but potential for improvement in one or more areas
- **Low scores (<40)**: Signals need for immediate attention to expense management or income optimization

## Use Cases

- **Dashboard Overview**: Quick health check in the Command HUD
- **Trend Analysis**: Track score changes over time to measure financial progress
- **Goal Setting**: Target score improvements through specific actions (e.g., expense reduction, automation setup)

## Limitations

- Score is period-specific and may fluctuate with irregular income/expenses
- Does not account for debt levels, asset allocation, or long-term investment strategy
- Roth automation bonus is binary; does not consider contribution amounts

## Related Metrics

- **Affordability**: Binary status based solely on unallocated income
- **Runway**: Daily spending capacity based on active transaction days
- **Protected Capital**: Sum of operating cash and emergency reserves