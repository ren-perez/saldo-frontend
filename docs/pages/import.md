# CSV Import — Feature Reference

**Route:** `/import-csv`  
**Entry points:** App nav · Presets page "Start import →" button (`?presetId=xxx`)

---

## Overview

The import flow processes CSV/XLSX files from any bank or export format and inserts normalized transactions into Convex. It supports single-account and multi-account files, auto-detects column schemas (with AI fallback), auto-pairs transfers, and resolves categories by name. The goal is zero manual intervention for well-structured export files.

---

## Key Files

| File | Role |
|------|------|
| `src/app/import-csv/page.tsx` | Main page — all phases, state, import orchestration |
| `src/utils/etl.ts` | CSV parsing, normalization, validation (`PresetConfig`, `NormalizedTransaction`) |
| `src/lib/presetInference.ts` | Heuristic + Gemini column schema detection |
| `src/app/api/infer-preset/route.ts` | Server-side Gemini API route (keeps key out of browser) |
| `src/components/AccountMappingStep.tsx` | Multi-account CSV → DB account mapping UI |
| `src/components/DuplicateReview.tsx` | Duplicate transaction review UI |
| `convex/transactions.ts` | `importTransactions` mutation — dedup, category resolution, session |
| `convex/transfers.ts` | `autoLinkTransferPairs` mutation — post-import transfer pairing |
| `convex/presets.ts` | `listPresets`, `getPreset`, `getPresetAccounts`, `createPreset`, `updatePreset` |
| `src/app/presets/page.tsx` | Preset creation dialog with inline schema inference |

---

## Import Phases

The page uses a `importPhase` state machine with these values:

```
upload → preview → [mapping] → reviewing → completed
```

The `mapping` phase is only inserted for multi-account presets (presets with `accountColumn` set). The step indicator adapts automatically (`BASE_STEPS` vs `MULTI_ACCOUNT_STEPS`).

---

## Phase 1 — Setup (upload)

### Preset picker

The preset picker is the primary control. All user presets are loaded via `api.presets.listPresets`. Multi-account presets are labelled `· Multi-account` in the dropdown.

When a preset is selected:
- `selectedPresetId` is set; the full preset is fetched via `api.presets.getPreset`
- `trustSource` resets to `false` (then auto-enables if the preset has `transferPairIdColumn`)
- `selectedAccount` resets to `null`

### Account picker

Only shown for single-account presets (when `preset.accountColumn` is not set). When a preset is selected, its linked accounts are fetched via `api.presets.getPresetAccounts` and the first linked account is auto-filled — no manual selection needed if the preset already knows its account.

### URL param shortcut

Navigating to `/import-csv?presetId=xxx` (e.g. from the Presets page "Start import →" button) pre-selects that preset and triggers the same auto-fill logic.

### Trust source toggle

Visible when a preset is selected. When ON: duplicates are silently skipped instead of queued for review. Auto-enables when the preset has `transferPairIdColumn` set (signals a trusted master-file format). The toggle can always be overridden manually.

### Preview button gate

- Multi-account preset: enabled when `file && preset`
- Single-account preset: enabled when `file && preset && selectedAccount`

---

## Phase 2 — Preview

The file is parsed (`Papa.parse` for CSV, `XLSX` for spreadsheets) and run through `processTransactions()` from `src/utils/etl.ts`. The first 10 normalized transactions are shown in a table. Processing stats (total / valid / error rows) are displayed.

If validation errors are found, they render in a `ValidationErrorList` and the import button is blocked.

For multi-account presets, the "Import" button advances to the `mapping` phase instead of importing directly.

---

## Phase 3 — Map Accounts (multi-account only)

`AccountMappingStep` receives the list of unique account identifier strings found in the CSV (via `extractUniqueAccountIdentifiers()` from the ETL) and the list of DB accounts.

**Auto-matching:** On mount, CSV values are compared case-insensitively against account names. Exact matches are pre-filled automatically and marked with a sparkle icon. The user only needs to manually assign unmatched values.

Once all values are mapped, `handleMultiAccountImport()` fires.

### Import progress overlay

While `handleMultiAccountImport` is running, the mapping UI is replaced by a progress overlay showing:
- Spinning ring with `X/Y` fraction
- "Account N of M: Name" subtitle
- Animated progress bar

Progress is tracked via `importProgress` state (`{ current, total, accountName }`).

---

## Phase 4 — Import / Duplicate Review (reviewing)

### Single-account import (`handleImport`)

1. Re-uses already-parsed transactions (avoids double parse)
2. Uploads the file to storage via `api.importActions.getUploadUrl`
3. Registers the import record via `api.imports.registerImport`
4. Calls `importTransactions` mutation with all normalized transactions
5. If duplicates exist and `trustSource` is OFF → enters reviewing phase
6. If no duplicates (or `trustSource` is ON) → calls `autoLinkTransferPairs` → completed

### Multi-account import (`handleMultiAccountImport`)

Runs the same steps as above once per account group (transactions are grouped by the account mapping). Each group gets its own `sessionId` and `importId`. Duplicate review sessions are chained — the user reviews one account at a time.

### Duplicate review

`DuplicateReview` component handles reviewing pending transactions. When the session is resolved via `handleSessionResolved`, the next pending session (if any) is advanced to, then `autoLinkTransferPairs` is called when all sessions are done.

### Deduplication key

`accountId:amount:normalized_description` — case-insensitive, whitespace-normalized description.

---

## Category Resolution (inside `importTransactions`)

Resolution priority per transaction:

1. If `category` string is set in the CSV row:
   - Try `categoryGroup + category` → exact match against DB (disambiguates same-name categories in different groups)
   - Try `category` alone → name-only match
   - Fall back to rules engine
   - If still no match → insert uncategorized; increment `unrecognizedCategories` counter
2. If no `category` in CSV → run rules engine only (existing behavior)

The `unrecognizedCategories` count is shown in the completion summary.

---

## Transfer Pairing (`autoLinkTransferPairs`)

Called automatically after every import completes (single or multi-account). Located in `convex/transfers.ts`.

**Phase 1 — Explicit CSV pair IDs**

Transactions with a matching `transfer_pair_id` string (from the CSV `transferPairIdColumn`) are grouped. Groups of exactly 2 transactions from different accounts are confirmed as paired. Both transactions get `transactionType: "transfer"` patched if not already set.

Edge cases:
- Group size ≠ 2 → `ambiguous++`, skip
- Both transactions in same account → `skipped++`, skip

**Phase 2 — Auto-detection (no pair ID)**

Remaining unpaired transactions are matched by: same absolute amount (±$0.01) + date within 2 days + different accounts. First valid match is paired with a generated `transfer_<timestamp>_<random>` ID.

Returns `{ paired, ambiguous, skipped }` shown in the completion dialog.

---

## Phase 5 — Completed

A success dialog shows summary pills:
- Transfers paired (blue)
- Duplicates auto-skipped (muted, only when `trustSource` was ON)
- Unrecognized categories (warning amber, if any)
- Ambiguous transfer IDs note (if any) — "check transfers inbox"

Closing the dialog navigates to `/transactions`.

---

## Preset Schema Inference

### Entry point

The preset creation dialog in `src/app/presets/page.tsx` accepts a file drop. On drop, `inferPresetFromCSV()` from `src/lib/presetInference.ts` is called.

### Layer 1 — Heuristics

Case-insensitive pattern matching against column headers:

| Field | Patterns matched |
|-------|-----------------|
| `dateColumn` | date, trans date, posted date, transaction date, posting date, effective date, value date |
| `descriptionColumn` | description, memo, payee, narrative, transaction description, details, merchant name, merchant |
| `accountColumn` | account, account name, account number, account id, account # |
| `categoryColumn` | category, category name |
| `categoryGroupColumn` | group, category group, category type, group name |
| `transactionTypeColumn` | type, transaction type, debit/credit, dr/cr, credit/debit |
| `transferPairIdColumn` | transfer pair id, pair id, transfer id, transfer_pair_id, link id |
| `amountColumn` (single) | amount, transaction amount, net amount, debit amount, credit amount, value |
| `debitColumn` | debit, withdrawals, withdrawal amount, debit amount, out |
| `creditColumn` | credit, deposits, deposit amount, credit amount, in |

Date format is inferred from sample values. Delimiter is detected from the raw first line character frequency.

If all required fields (date, description, amount) are resolved → return `confidence: "high"` (or `"medium"` if some headers are unmapped). No AI call.

### Layer 2 — Gemini fallback

Only called when ≥1 required field is unresolved after heuristics. The request goes to `/api/infer-preset` (Next.js server route) which calls `gemini-2.0-flash` — the API key never reaches the browser.

When AI is used, the dialog shows: `✦ AI-assisted · N tokens`

### Inference result dialog states

1. **idle** — file drop zone shown
2. **inferring** — spinner while parsing + inference runs
3. **preview** — detected column badges listed; AI indicator if used; "Drop another file to re-detect"
4. **success** — "Preset created! Start import →" or "Done"

---

## ETL Layer (`src/utils/etl.ts`)

### `PresetConfig`

Key fields:

| Field | Type | Purpose |
|-------|------|---------|
| `delimiter` | `string` | CSV delimiter (`,` `;` `\t` `\|`) |
| `hasHeader` | `boolean` | Whether first row is headers |
| `skipRows` | `number` | Rows to skip before data |
| `dateColumn` | `string` | Header name for date |
| `dateFormat` | `string` | strftime-style format (`%Y-%m-%d`, `%m/%d/%Y`, etc.) |
| `descriptionColumn` | `string` | Header name for description |
| `amountColumns` | `string[]` | One or two amount column names |
| `amountProcessing` | `AmountProcessing` | How to compute the final amount (single column or debit/credit split) |
| `accountColumn?` | `string` | Header for account identifier (multi-account presets) |
| `categoryColumn?` | `string` | Header for category name |
| `categoryGroupColumn?` | `string` | Header for category group name |
| `transactionTypeColumn?` | `string` | Header for transaction type |
| `transferPairIdColumn?` | `string` | Header for transfer pair ID |

### `NormalizedTransaction`

Output of `processTransactions()`:

```ts
{
  date: string;           // ISO YYYY-MM-DD
  amount: number;         // negative = debit, positive = credit
  description: string;
  category?: string;
  categoryGroup?: string;
  transactionType?: string;
  account?: string;       // raw CSV account identifier
  transferPairId?: string;
  rawData: Record<string, unknown>;
}
```

### `AmountProcessing`

Two modes:

**Single column:** `{ amount_column, amount_multiplier }` — multiplier typically `1` or `-1` to flip sign.

**Debit/credit split:** `{ debit_column, credit_column, debit_multiplier: -1, credit_multiplier: 1 }` — debit is stored as negative, credit as positive.

---

## Convex Schema (import-related tables)

| Table | Key fields |
|-------|-----------|
| `presets` | `name`, `delimiter`, `dateColumn`, `dateFormat`, `descriptionColumn`, `amountColumns`, `amountProcessing`, `accountColumn?`, `categoryColumn?`, `categoryGroupColumn?`, `transactionTypeColumn?`, `transferPairIdColumn?` |
| `imports` | `userId`, `accountId`, `fileKey`, `fileName`, `status` (`pending`/`processing`/`completed`/`failed`) |
| `import_sessions` | `sessionId`, `accountId`, `importId`, `pendingTransactions[]` (including `transfer_pair_id`, `categoryGroup`) |
| `transactions` | `accountId`, `date`, `amount`, `description`, `categoryId?`, `transactionType?`, `transfer_pair_id?`, `importId` |

---

## Session Persistence (localStorage)

| Key | Value | Purpose |
|-----|-------|---------|
| `import_session_id` | `string` | Active single-account session — allows page refresh without losing review state |
| `import_multi_sessions` | `JSON` | Multi-account session state: `{ sessionIds, importIds, currentIndex, hasDuplicatesMap }` — resumes at the first unresolved session |

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Preset has `transferPairIdColumn` | `trustSource` auto-enabled on preset select |
| Single-account preset with linked account | Account picker auto-fills on preset select |
| CSV account value matches DB account name exactly | Auto-matched in AccountMappingStep (case-insensitive) |
| CSV category not found in DB, rules engine also misses | Inserted uncategorized; counted in `unrecognizedCategories` |
| Transfer pair group has ≠ 2 transactions | Counted as `ambiguous`; not paired; user directed to transfers inbox |
| Both transfer pair transactions in same account | Counted as `skipped`; not paired |
| Gemini API unavailable or returns invalid JSON | Falls back to heuristic result; confidence marked `"low"` |
| Page refreshed mid-import | Session ID from localStorage re-hydrates review state |
| Multi-account import interrupted | `import_multi_sessions` in localStorage tracks progress; resumes at first pending session |
