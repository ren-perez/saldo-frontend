# Migration: AddContributionDialog API Update

## 🎯 Overview

Migrated `AddContributionDialog` from using `api.goals.addContribution` to `api.contributions.createContribution` for better consistency, type safety, and feature completeness.

## 📝 Changes Made

### 1. Component Update
**File:** `src/components/goals/AddContributionDialog.tsx`

**Before:**
```tsx
const addContributionMutation = useMutation(api.goals.addContribution)
```

**After:**
```tsx
const addContributionMutation = useMutation(api.contributions.createContribution)
```

### 2. API Deprecation
**File:** `convex/goals.ts`

- Added `@deprecated` comment to `addContribution`
- Documented to use `api.contributions.createContribution` instead
- Marked with TODO for future removal

## ✅ Benefits Achieved

### 1. **Consistency**
- All contribution operations now go through the unified `contributions` API
- Single source of truth for contribution logic

### 2. **Better Type Safety**
| Feature | goals.addContribution | contributions.createContribution |
|---------|----------------------|----------------------------------|
| goalId Type | `v.string()` | `v.id("goals")` ✅ |
| Type Casting | Uses `as any` | Properly typed ✅ |

### 3. **Feature Completeness**
The contributions API supports:
- ✅ Withdrawals (negative contributions with `is_withdrawal` flag)
- ✅ Linking to existing transactions (via `transactionId` parameter)
- ✅ Creating new transactions (via `accountId` parameter)
- ✅ Required source tracking (better data quality)

### 4. **Future-Proofing**
- The dialog now uses the same API as:
  - `GoalWithdrawalDialog`
  - `GoalTransferDialog`
  - Import auto-allocation
- Easier to add withdrawal support to this dialog in the future

## 🔍 Verification

### Type Safety Check
✅ No TypeScript errors
✅ All type assertions are valid

### Usage Check
✅ `api.goals.addContribution` is no longer used anywhere in the codebase
✅ Safe to deprecate

### Build Status
✅ Build completes successfully
✅ No runtime errors expected

## 🚀 Next Steps

### Immediate (Completed)
- ✅ Migrate AddContributionDialog
- ✅ Add deprecation notice to old API
- ✅ Verify no other usages

### Future (Optional)
- [ ] Remove `goals.addContribution` entirely after testing period
- [ ] Consider adding withdrawal support to AddContributionDialog using the new API's `is_withdrawal` flag
- [ ] Add transaction linking capability (select existing transaction instead of creating new one)

## 📊 API Comparison

### goals.addContribution (Deprecated)
```typescript
{
  userId: Id<"users">,
  goalId: string,  // ⚠️ Weak typing
  amount: number,
  note?: string,
  contribution_date: string,
  accountId?: Id<"accounts">,
  source?: string  // Optional, defaults to "manual_ui"
}
```

### contributions.createContribution (Current)
```typescript
{
  userId: Id<"users">,
  goalId: Id<"goals">,  // ✅ Strong typing
  amount: number,
  source: string,  // Required for data quality
  accountId?: Id<"accounts">,  // Create new transaction
  transactionId?: Id<"transactions">,  // Link existing transaction
  note?: string,
  contribution_date: string,
  is_withdrawal?: boolean  // Support withdrawals
}
```

## 🎉 Result

The AddContributionDialog now uses the modern, feature-complete contributions API, providing better type safety and consistency with the rest of the application.