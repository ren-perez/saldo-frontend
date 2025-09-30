# 🔍 Debug Transfer Transactions Not Showing

## Issue
Transfer transactions with positive amounts in account 0244 are not showing in UnallocatedTransactions section.

## Possible Causes

### 1. ✅ Transaction Amount Check
**Code:** Line 56 in `UnallocatedTransactions.tsx`
```tsx
const positiveTransactions = transactions?.filter(t => t.amount > 0) || []
```

**Check:**
- Are the transaction amounts actually > 0?
- Could they be exactly 0?
- Are they stored as strings instead of numbers?

### 2. ✅ Already Allocated
**Code:** Lines 337-340 in `contributions.ts`
```typescript
const existingContributions = await ctx.db
    .query("goal_contributions")
    .withIndex("by_transaction", (q) => q.eq("transactionId", transaction._id))
    .collect();

if (existingContributions.length === 0) {
    // Only show if NO contributions exist
}
```

**Check:**
- Do these transactions already have `goal_contributions` linked?
- Were they previously allocated before you linked the goal?

### 3. ❓ Account Mismatch
**Check:**
- Are the transactions actually in account "0244"?
- Is "0244" the correct account ID (should be something like "jd7xyz...")?

### 4. ❓ Transaction Type Filter (Unlikely)
The code doesn't filter by `transactionType`, so "transfer" type should work.

## 🛠️ How to Debug

### Option 1: Check Database Directly
Look at your transactions table for account 0244:
- Check `amount` field (should be positive number)
- Check `_id` field
- Check `accountId` field (should match)

### Option 2: Check for Existing Contributions
Look at `goal_contributions` table:
- Filter by `transactionId` matching your 2 transaction IDs
- If records exist, those transactions are already "allocated"

### Option 3: Add Console Logging (Temporary)
Add to `UnallocatedTransactions.tsx` line 57:
```tsx
const positiveTransactions = transactions?.filter(t => {
    console.log('Transaction:', t._id, 'Amount:', t.amount, 'Type:', typeof t.amount);
    return t.amount > 0;
}) || []
```

## 🎯 Most Likely Cause

**The transactions already have goal_contributions linked to them.**

This can happen if:
1. They were auto-allocated during import (if goal was already linked)
2. They were manually allocated before
3. There's a stale contribution record

## 💡 Solution

If transactions are already allocated, you should see them in:
1. **Goal Progress** - Contributing to the goal's `current_amount`
2. **Contribution History** (`/goals/history`) - Listed in the history
3. **Goal Card** - The current amount should reflect these contributions

If they're NOT showing there either, then there might be a data integrity issue.

---

## 🔧 Quick Fix to Test

Temporarily modify the filter to see ALL transactions:

**File:** `src/components/goals/UnallocatedTransactions.tsx`
**Line 56:**

```tsx
// OLD
const positiveTransactions = transactions?.filter(t => t.amount > 0) || []

// NEW (temporary debug)
const positiveTransactions = transactions || [] // Show everything
```

Then check:
- Do the transfers show up now?
- What's their amount displayed?
- What happens when you click "Allocate"?

This will help identify if it's a filtering issue or a data issue.