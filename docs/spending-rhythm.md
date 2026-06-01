# Spending Rhythm

Spending Rhythm measures the consistency and frequency of financial activity throughout a given period. It helps users understand their transaction patterns by tracking "active days" (days with recorded financial transactions) relative to the total days in the period.

## Calculation

### Active Days
- **Definition**: Number of days in the period with at least one financial transaction
- **Source**: Count of keys in `dailyStats` object from dashboard data
- **Formula**: `Object.keys(dailyStats).length`

### Habit Density
- **Definition**: Percentage of period days that were active
- **Formula**: `Math.round((activeDays / daysInMonth) * 100)`
- **Purpose**: Normalizes activity level for different period lengths

### Tone Determination
- **Blue**: `activeDays ≤ 18` (moderate activity)
- **Amber**: `activeDays > 18` (high activity)

## Display

### Module Focus Card
- **Title**: "Spending rhythm"
- **Value**: "{activeDays} days" (e.g., "15 days")
- **Subtext**: "{habitDensity}% of {monthShort[month]}" (e.g., "48% of May")
- **Tone**: Blue for moderate, Amber for high activity

### Strategic Briefing Note
- **Title**: "Density"
- **Body**: "{activeDays} active days ({habitDensity}% density) — [interpretation based on density]"

## Interpretation Guidelines

### Density Ranges
- **Low (<50%)**: Infrequent activity; may indicate irregular income/expenses or strong discipline
- **Moderate (50-75%)**: Balanced rhythm; sustainable spending patterns
- **High (>75%)**: Very active period; potential for "leak spending" (small, habitual purchases)

### Tone Meanings
- **Blue (≤18 active days)**: Steady, controlled financial engagement
- **Amber (>18 active days)**: High transaction frequency; monitor for impulse spending

## Use Cases

- **Pattern Recognition**: Identify spending habits and consistency
- **Leak Detection**: Flag periods with excessive small transactions
- **Goal Alignment**: Ensure activity levels support financial objectives
- **Trend Analysis**: Track changes in transaction frequency over time

## Limitations

- Based solely on transaction count, not amounts
- Doesn't distinguish between income and expense transactions
- Period-specific; may vary with income timing or life events
- Thresholds (18 days) are fixed and may not suit all users

## Dashboard Widget

The `SpendingRhythm` component lives on the dashboard and renders a two-column card: a calendar/chart on the left and a details pane on the right.

### Granularity Modes

Controlled by `granularity` from `DashboardContext`. The subtitle line updates to reflect the active mode.

| Mode | View | Data |
|------|------|------|
| `monthly` | Full month calendar grid | Per-day income/expense/goal cells; planned income markers |
| `weekly` | 7-day strip | Active week based on `periodOffset` |
| `daily` | Single day cell | Day pointed to by `periodOffset` |
| `yearly` | Bar chart of 12 months | Aggregated from `dailyStats` keys |

### Interaction Model

- **Hover** a cell → details pane shows a live preview (dimmed) for that date.
- **Click** a cell → pins the selection; clicking again deselects.
- **Escape** → clears the pinned selection.
- `hoveredDate` takes display priority over `selectedDate`; when both are null the details pane shows period-level summaries.

### Details Pane (right column)

Shows context for the selected or hovered date:
- **Transaction list** for the date (income, expenses, goal contributions).
- **Planned income items** — entries from `plannedIncomes` that fall on that date.
- **Account health strip** — operating cash (checking accounts), credit exposure (negative credit balances), emergency reserve (savings accounts).
- **Account flows** — per-account inflow/outflow sourced from `stats.accountFlows`.
- **Period totals** — income, expenses, goal contributions for the whole visible period.

### Props

| Prop | Type | Notes |
|------|------|-------|
| `stats` | `any` | Dashboard stats including `dailyStats`, `totalIncome/Expenses/Goals`, `accountFlows` |
| `goals` | `GoalData[]` | Used by the (currently commented-out) `GoalRail` |
| `plannedIncomes` | `PlannedIncome[]` | Shown as markers on calendar cells and listed in the details pane |
| `accounts` | `any[]` | Used to compute operating cash, credit exposure, emergency reserve |
| `accountBalanceHistories` | `any` | Passed to the details pane for balance trend rendering |

## Related Metrics

- **Cashflow Score**: Incorporates expense efficiency but not activity frequency
- **Affordability**: Focuses on surplus, not transaction patterns
- **Runway**: Daily spending capacity, independent of activity frequency