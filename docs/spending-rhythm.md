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

## Related Metrics

- **Cashflow Score**: Incorporates expense efficiency but not activity frequency
- **Affordability**: Focuses on surplus, not transaction patterns
- **Runway**: Daily spending capacity, independent of activity frequency