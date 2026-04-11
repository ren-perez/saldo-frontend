# Chat Tools Contract

Internal spec for `chatTools.ts` — the stable API surface that Telegram, WhatsApp, and Gemini should use to interact with Saldo data.

**Do not call generic UI mutations (transactions.ts, accounts.ts, etc.) from the bot.**
**All chat-triggered finance actions go through this module.**

---

## User resolution

All tools accept `telegramUserId` (string from the Telegram webhook) and resolve the Saldo `userId` internally via the active `telegram_connections` record.

Chat actions **never** accept a raw `userId` as input — the connection lookup is the identity proof.

---

## Standard response shape

Every tool returns:

```json
{
  "success": true | false,
  "code": "SCREAMING_SNAKE_CODE",
  "message": "Human-readable description",
  "data": { ... }   // present on success, absent on failure
}
```

---

## Tools

### `getAccountsForUser`

**Purpose:** List the user's accounts so the bot can reference valid account IDs.

| | |
|---|---|
| **Type** | `query` |
| **Module** | `chatTools` |

**Args:**

| Name | Type | Required |
|---|---|---|
| `telegramUserId` | `string` | yes |

**Response data:**

```ts
Array<{
  id: Id<"accounts">
  name: string
  bank: string
  type: string
  balance: number | null
}>
```

**Codes:** `ACCOUNTS_FETCHED` | `USER_NOT_LINKED`

---

### `getCategoriesForUser`

**Purpose:** Fetch the user's category vocabulary so the bot can classify transactions safely.

| | |
|---|---|
| **Type** | `query` |
| **Module** | `chatTools` |

**Args:**

| Name | Type | Required |
|---|---|---|
| `telegramUserId` | `string` | yes |

**Response data:**

```ts
Array<{
  id: Id<"categories">
  name: string
  groupId: Id<"category_groups"> | null
  transactionType: string | null
}>
```

**Codes:** `CATEGORIES_FETCHED` | `USER_NOT_LINKED`

---

### `getBalance`

**Purpose:** Answer "what's my balance?" using the stored `accounts.balance` field.

| | |
|---|---|
| **Type** | `query` |
| **Module** | `chatTools` |

**Balance rule:** source of truth is `accounts.balance`. Accounts without a stored balance are included in the list but excluded from `totalKnownBalance`. When `hasPartialData` is true, the bot should caveat the total.

**Args:**

| Name | Type | Required |
|---|---|---|
| `telegramUserId` | `string` | yes |

**Response data:**

```ts
{
  accounts: Array<{
    id: Id<"accounts">
    name: string
    bank: string
    balance: number | null
  }>
  totalKnownBalance: number
  hasPartialData: boolean
}
```

**Codes:** `BALANCE_FETCHED` | `USER_NOT_LINKED`

---

### `listTransactionsForChat`

**Purpose:** Return recent transactions for chat display. Lightweight fields only.

| | |
|---|---|
| **Type** | `query` |
| **Module** | `chatTools` |

**Args:**

| Name | Type | Required | Notes |
|---|---|---|---|
| `telegramUserId` | `string` | yes | |
| `limit` | `number` | yes | Capped at 50 server-side |
| `accountId` | `Id<"accounts">` | no | |
| `categoryId` | `Id<"categories">` | no | |
| `startDate` | `number` | no | Unix ms |
| `endDate` | `number` | no | Unix ms |

**Response data:**

```ts
Array<{
  id: Id<"transactions">
  date: number
  amount: number
  description: string
  accountId: Id<"accounts">
  categoryId: Id<"categories"> | null
  transactionType: string | null
}>
```

**Codes:** `TRANSACTIONS_FETCHED` | `USER_NOT_LINKED` | `ACCOUNT_NOT_FOUND`

---

### `createTransactionFromChat`

**Purpose:** Create a manual transaction from a chat message.

| | |
|---|---|
| **Type** | `mutation` |
| **Module** | `chatTools` |
| **Audit** | Writes to `actions` table on success |

**Account selection strategy:**

- `accountId` provided → ownership-checked, used directly
- Not provided + 1 account → used automatically
- Not provided + multiple accounts → returns `ACCOUNT_REQUIRED` with options
- Not provided + 0 accounts → returns `NO_ACCOUNTS`

**Args:**

| Name | Type | Required | Notes |
|---|---|---|---|
| `telegramUserId` | `string` | yes | |
| `accountId` | `Id<"accounts">` | no | Auto-resolved if user has exactly one |
| `amount` | `number` | yes | Positive = income, negative = expense |
| `date` | `number` | yes | Unix ms |
| `description` | `string` | yes | |
| `transactionType` | `string` | no | e.g. `"income"`, `"expense"`, `"transfer"` |
| `categoryId` | `Id<"categories">` | no | |
| `sourceTelegramMessageId` | `string` | no | Stored in audit log |

**Response data:**

```ts
{ transactionId: Id<"transactions"> }
```

**Codes:** `TRANSACTION_CREATED` | `USER_NOT_LINKED` | `ACCOUNT_NOT_FOUND` | `NO_ACCOUNTS` | `ACCOUNT_REQUIRED` | `CATEGORY_NOT_FOUND`

---

### `updateTransactionFromChat`

**Purpose:** Edit safe fields on an existing transaction. Amount and date are deferred.

| | |
|---|---|
| **Type** | `mutation` |
| **Module** | `chatTools` |
| **Audit** | Writes to `actions` table on success |

**Editable fields (chat scope):** `description`, `categoryId`, `transactionType`

**Args:**

| Name | Type | Required |
|---|---|---|
| `telegramUserId` | `string` | yes |
| `transactionId` | `Id<"transactions">` | yes |
| `updates.description` | `string` | no |
| `updates.categoryId` | `Id<"categories">` | no |
| `updates.transactionType` | `string` | no |
| `sourceTelegramMessageId` | `string` | no |

**Response data:**

```ts
{ transactionId: Id<"transactions"> }
```

**Codes:** `TRANSACTION_UPDATED` | `USER_NOT_LINKED` | `TRANSACTION_NOT_FOUND` | `CATEGORY_NOT_FOUND`

---

## Deferred / not exposed

| Action | Status |
|---|---|
| `deleteTransaction` | Deferred — no direct delete in chat layer. Confirmation flow TBD. |
| Compute balance from transactions | Deferred — using `accounts.balance` for now. |
| Amount/date edits in `updateTransaction` | Deferred — higher risk, lower urgency. |

---

## Error codes reference

| Code | Meaning |
|---|---|
| `USER_NOT_LINKED` | `telegramUserId` has no active Saldo connection |
| `ACCOUNT_NOT_FOUND` | Account doesn't exist or doesn't belong to user |
| `NO_ACCOUNTS` | User has no accounts at all |
| `ACCOUNT_REQUIRED` | User has multiple accounts; one must be specified |
| `CATEGORY_NOT_FOUND` | Category doesn't exist or doesn't belong to user |
| `TRANSACTION_NOT_FOUND` | Transaction doesn't exist or doesn't belong to user |
| `ACCOUNTS_FETCHED` | Success — account list returned |
| `CATEGORIES_FETCHED` | Success — category list returned |
| `BALANCE_FETCHED` | Success — balance data returned |
| `TRANSACTIONS_FETCHED` | Success — transaction list returned |
| `TRANSACTION_CREATED` | Success — transaction inserted |
| `TRANSACTION_UPDATED` | Success — transaction patched |
