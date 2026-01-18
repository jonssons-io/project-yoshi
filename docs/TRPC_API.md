# tRPC API Documentation

This document describes all the tRPC routes available in the Budget App.

## Authentication

All routes require a `userId` parameter (from Clerk authentication). In the future, this will be extracted from the session token automatically.

## Routers

### Budgets Router (`trpc.budgets`)

Manage budget entities.

#### `budgets.list`

List all budgets for the authenticated user.

**Input:**
```typescript
{
  userId: string
}
```

**Output:**
```typescript
Array<Budget & {
  _count: {
    categories: number
    accounts: number
    transactions: number
  }
}>
```

#### `budgets.getById`

Get a specific budget by ID.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
Budget & {
  categories: Category[]
  accounts: Account[]
  _count: {
    transactions: number
  }
}
```

#### `budgets.create`

Create a new budget.

**Input:**
```typescript
{
  name: string // min 1 character
  startDate: Date
  userId: string
}
```

**Output:**
```typescript
Budget
```

#### `budgets.update`

Update an existing budget.

**Input:**
```typescript
{
  id: string
  userId: string
  name?: string // min 1 character
  startDate?: Date
}
```

**Output:**
```typescript
Budget
```

#### `budgets.delete`

Delete a budget (cascades to categories, accounts, transactions).

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
{ success: true }
```

---

### Categories Router (`trpc.categories`)

Manage income and expense categories.

#### `categories.list`

List all categories for a budget.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  type?: 'INCOME' | 'EXPENSE'
}
```

**Output:**
```typescript
Array<Category & {
  _count: {
    transactions: number
  }
}>
```

#### `categories.getById`

Get a specific category by ID.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
Category & {
  budget: Budget
  _count: {
    transactions: number
  }
}
```

#### `categories.create`

Create a new category.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  name: string // min 1 character
  type: 'INCOME' | 'EXPENSE'
}
```

**Output:**
```typescript
Category
```

#### `categories.update`

Update an existing category.

**Input:**
```typescript
{
  id: string
  userId: string
  name?: string // min 1 character
  type?: 'INCOME' | 'EXPENSE'
}
```

**Output:**
```typescript
Category
```

#### `categories.delete`

Delete a category. **Note:** Will fail if transactions exist using this category.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
{ success: true }
```

**Error:** Throws `PRECONDITION_FAILED` if category has transactions.

---

### Accounts Router (`trpc.accounts`)

Manage financial accounts.

#### `accounts.list`

List all accounts for a budget.

**Input:**
```typescript
{
  budgetId: string
  userId: string
}
```

**Output:**
```typescript
Array<Account & {
  _count: {
    transactions: number
  }
}>
```

#### `accounts.getById`

Get a specific account by ID.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
Account & {
  budget: Budget
  _count: {
    transactions: number
  }
}
```

#### `accounts.getBalance`

Get current balance for an account (initial balance + sum of transactions).

**Input:**
```typescript
{
  id: string
  userId: string
  asOfDate?: Date // defaults to today
}
```

**Output:**
```typescript
{
  accountId: string
  accountName: string
  initialBalance: number
  transactionTotal: number
  currentBalance: number
  asOfDate: Date
  transactionCount: number
}
```

**Balance Calculation:**
- `currentBalance = initialBalance + sum(INCOME transactions) - sum(EXPENSE transactions)`
- Only includes transactions where `date <= asOfDate`

#### `accounts.create`

Create a new account.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  name: string // min 1 character
  externalIdentifier?: string
  initialBalance?: number // defaults to 0
}
```

**Output:**
```typescript
Account
```

#### `accounts.update`

Update an existing account.

**Input:**
```typescript
{
  id: string
  userId: string
  name?: string // min 1 character
  externalIdentifier?: string | null
  initialBalance?: number
}
```

**Output:**
```typescript
Account
```

#### `accounts.delete`

Delete an account. **Note:** Will fail if transactions exist using this account.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
{ success: true }
```

**Error:** Throws `PRECONDITION_FAILED` if account has transactions.

---

### Transactions Router (`trpc.transactions`)

Manage income and expense transactions.

#### `transactions.list`

List transactions with flexible filtering.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  accountId?: string
  categoryId?: string
  dateFrom?: Date
  dateTo?: Date
  type?: 'INCOME' | 'EXPENSE'
}
```

**Output:**
```typescript
Array<Transaction & {
  category: Category
  account: Account
}>
```

#### `transactions.getById`

Get a specific transaction by ID.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
Transaction & {
  category: Category
  account: Account
  budget: Budget
}
```

#### `transactions.groupedByCategory`

Get transactions grouped by category with totals.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  dateFrom?: Date
  dateTo?: Date
  type?: 'INCOME' | 'EXPENSE'
}
```

**Output:**
```typescript
Array<{
  category: Category
  transactions: Array<Transaction & { category: Category }>
  total: number
  count: number
}>
```

#### `transactions.create`

Create a new transaction.

**Input:**
```typescript
{
  budgetId: string
  userId: string
  accountId: string
  categoryId: string
  name: string // min 1 character
  amount: number // must be positive
  date: Date
  notes?: string
}
```

**Output:**
```typescript
Transaction & {
  category: Category
  account: Account
}
```

**Validation:**
- Account must belong to the specified budget
- Category must belong to the specified budget

#### `transactions.update`

Update an existing transaction.

**Input:**
```typescript
{
  id: string
  userId: string
  accountId?: string
  categoryId?: string
  name?: string // min 1 character
  amount?: number // must be positive
  date?: Date
  notes?: string | null
}
```

**Output:**
```typescript
Transaction & {
  category: Category
  account: Account
}
```

**Validation:**
- If changing account, new account must belong to the same budget
- If changing category, new category must belong to the same budget

#### `transactions.delete`

Delete a transaction.

**Input:**
```typescript
{
  id: string
  userId: string
}
```

**Output:**
```typescript
{ success: true }
```

#### `transactions.clone`

Clone an existing transaction (useful for recurring transactions).

**Input:**
```typescript
{
  id: string
  userId: string
  date?: Date // defaults to today
}
```

**Output:**
```typescript
Transaction & {
  category: Category
  account: Account
}
```

---

## Error Handling

All routes may throw the following errors:

- `NOT_FOUND`: Resource not found or user doesn't have access
- `BAD_REQUEST`: Invalid input or business logic violation
- `PRECONDITION_FAILED`: Operation cannot be completed (e.g., deleting category with transactions)

## Usage Example

```typescript
import { trpc } from '@/integrations/trpc/react'

function BudgetList() {
  const { user } = useUser() // Clerk
  
  const { data: budgets, isLoading } = trpc.budgets.list.useQuery({
    userId: user.id
  })
  
  const createBudget = trpc.budgets.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      trpc.useUtils().budgets.list.invalidate()
    }
  })
  
  const handleCreate = () => {
    createBudget.mutate({
      userId: user.id,
      name: 'My Budget',
      startDate: new Date()
    })
  }
  
  return (
    <div>
      {budgets?.map(budget => (
        <div key={budget.id}>{budget.name}</div>
      ))}
      <button onClick={handleCreate}>Create Budget</button>
    </div>
  )
}
```

## Future Enhancements

- [ ] Automatic userId extraction from Clerk session (remove from inputs)
- [ ] Implement proper Clerk middleware for `protectedProcedure`
- [ ] Add pagination for large result sets
- [ ] Add transaction batch operations
- [ ] Add budget statistics/analytics endpoints
- [ ] Add data export endpoints
