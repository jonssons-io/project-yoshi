# User Stories — Phase 1

Derived from [PROJECT_BRIEF.md](./PROJECT_BRIEF.md). These user stories cover all
Phase 1 functionality. Phase 2 (Insights & Planning) stories will be added when
that phase begins.

---

## 1. Accounts

### US-1.1: Create an account

> As a household member, I want to create an account with a name, initial balance,
> and external identifier, so that I can represent my real-world bank account or
> cash holding and map it to the one at my bank.

**Acceptance Criteria:**

- Account is created with `name`, `initial_balance`, and `external_identifier`
  (e.g., a bank account number or label the user defines).
- `current_balance` is set equal to `initial_balance` at creation.
- Account belongs to the user's household.
- Initial balance can be zero or positive.

---

### US-1.2: View account balance

> As a household member, I want to see my account's current balance, so that I
> know how much real money I have available in that account.

**Acceptance Criteria:**

- `current_balance` reflects `initial_balance` plus all **effective** income
  transactions, minus all **effective** expense transactions, plus/minus all
  **effective** transfers involving this account.
- Future-dated transactions do **not** affect `current_balance` until their date
  has arrived (see US-4.6).
- Balance is always derivable from the transaction history (source of truth).

---

### US-1.3: Edit an account

> As a household member, I want to edit an account's name and external identifier,
> so that I can correct mistakes or reflect real-world changes.

**Acceptance Criteria:**

- Name and external identifier can be updated.
- `initial_balance` cannot be changed after creation.
- Editing an account does not affect any existing transactions.

---

### US-1.4: Archive an account

> As a household member, I want to archive an account I no longer use, so that
> it's hidden from active views but its transaction history is preserved.

**Acceptance Criteria:**

- Accounts with connected transactions can only be **archived**, not deleted.
- An archived account no longer appears in active account lists.
- All transactions linked to an archived account remain intact and queryable.
- An account with zero transactions may be permanently deleted (optional —
  backend developer's call).

---

## 2. Bills and Income — Blueprints

### US-2.1: Create a bill blueprint

> As a household member, I want to create a bill blueprint with a name, recurrence
> rule, start date, optional end date, recipient, optional category, optional
> linked account and budget, and optional splits, so that the system generates
> expected bill instances.

**Acceptance Criteria:**

- Blueprint is created with: `name`, `type` = `bill`, `recurrence` (one_time |
  weekly | monthly | yearly | custom), `start_date`, `recipient` (required).
- Optional fields: `end_date`, `category_id`, `account_id`, `budget_id`.
- **Split system**: A bill blueprint can have one or more splits. Each split has a
  `sub_name`, `sub_amount`, `budget_id`, and optional `category_id`. The sum of
  all split `sub_amount` values equals the blueprint's total amount. If no splits
  are provided, the blueprint has a single amount with the top-level
  `budget_id`/`category_id`.
- The total amount is **derived** from the sum of splits (not set independently
  when splits are present).
- Upon creation, instances are automatically generated based on the recurrence
  rule (up to 12 months ahead).
- If `end_date` is provided, no instances are generated beyond that date.
- Blueprint belongs to the user's household.

---

### US-2.2: Create an income blueprint

> As a household member, I want to create an income blueprint with a name,
> recurrence rule, start date, optional end date, amount, and payer, so that the
> system generates expected income instances.

**Acceptance Criteria:**

- Blueprint is created with: `name`, `type` = `income`, `amount`, `recurrence`,
  `start_date`, `payer` (required).
- Optional fields: `end_date`, `account_id`.
- `budget_id` is not applicable for income blueprints.
- Upon creation, instances are automatically generated (up to 12 months ahead).
- If `end_date` is provided, no instances are generated beyond that date.

---

### US-2.3: Edit a blueprint (propagate to upcoming instances)

> As a household member, I want to edit a blueprint's properties, so that all
> future (upcoming) instances reflect the updated values.

**Acceptance Criteria:**

- Editing a blueprint updates all instances with status `upcoming`.
- Instances with status `due` or `handled` are **not** changed unless the user
  explicitly confirms.
- If recurrence, start_date, or end_date changes, instances are regenerated
  accordingly (upcoming ones replaced, handled ones preserved).
- The blueprint record itself is updated.

---

### US-2.4: Edit a single instance

> As a household member, I want to edit a single instance's amount or due date, so
> that I can adjust for a one-off variation without changing the blueprint.

**Acceptance Criteria:**

- Only the targeted instance is modified.
- The parent blueprint and all other instances remain unchanged.
- Only instances with status `upcoming` or `due` can be edited (not `handled`).

---

### US-2.5: Delete / archive a blueprint

> As a household member, I want to delete or archive a blueprint, so that future
> instances are removed while handled history is preserved.

**Acceptance Criteria:**

- Deleting/archiving a blueprint removes all `upcoming` instances.
- `Handled` instances (linked to real transactions) are **preserved** in the
  database.
- The blueprint itself is archived (soft-deleted) if any handled instances exist.

---

## 3. Bills and Income — Instances

### US-3.1: Auto-generate instances from blueprint

> As the system, when a blueprint is created, I want to automatically generate
> instances up to 12 months ahead, so that users can see their expected future
> bills and income.

**Acceptance Criteria:**

- Instances are generated for up to 12 months from the current date.
- Each instance has `blueprint_id`, `due_date`, `amount` (copied from blueprint,
  including splits), `status` = `upcoming`, `transaction_id` = null.
- One-time blueprints generate exactly one instance.
- If `end_date` is set on the blueprint, no instances are generated beyond it.

---

### US-3.2: Monthly instance maintenance

> As the system, I want to run a periodic check (at least monthly) that ensures
> each active blueprint always has 12 unhandled instances looking ahead, creating
> any missing ones.

**Acceptance Criteria:**

- For each active blueprint, count instances with status `upcoming` or `due`.
- If fewer than 12 exist, generate new instances to fill the 12-month rolling
  window.
- Respects the blueprint's `end_date` — does not generate past it.
- Does not duplicate existing instances for the same due date.

---

### US-3.3: Instance status transitions

> As the system, I want instance statuses to transition correctly, so that the
> household always has an accurate view of what's upcoming, due, or handled.

**Acceptance Criteria:**

- An instance starts as `upcoming`.
- When `due_date` arrives (or passes), status transitions to `due`.
- When a transaction is linked to the instance, status transitions to `handled`.
- Transitions are one-directional: `upcoming` → `due` → `handled`.
- Unlinking a transaction from an instance reverts status to `due` or `upcoming`
  depending on the date.

---

### US-3.4: Link a transaction to an instance

> As a household member, I want to link a transaction to a bill or income instance,
> so that the instance is marked as handled.

**Acceptance Criteria:**

- Linking sets `instance.transaction_id` to the transaction's ID.
- Instance status changes to `handled`.
- An instance can only be linked to one transaction.
- A transaction can only be linked to one instance.
- The linked transaction's amount does not need to exactly match the instance
  amount.

---

## 4. Transactions

### US-4.1: Create an expense transaction

> As a household member, I want to record an expense transaction with a name,
> amount, date, account, recipient, budget, optional category, optional instance
> link, and optional splits, so that my spending is tracked.

**Acceptance Criteria:**

- Transaction is created with `type` = `expense`, `name`, `amount`, `date`,
  `account_id`, `recipient` (required), `budget_id` (required if no splits).
- Optional: `category_id`, `instance_id`, `note`.
- **Split system**: A transaction can have one or more splits. Each split has a
  `sub_name`, `sub_amount`, `budget_id`, and optional `category_id`. The sum of
  split `sub_amount` values equals the transaction total. If no splits, the
  top-level `budget_id`/`category_id` applies.
- **If the transaction date is today or in the past** (effective): account
  `current_balance` decreases; budget(s) `total_spent` increases.
- **If the transaction date is in the future** (pending): account balance and
  budget allocations are **not** affected until the date arrives (see US-4.6).
- Effective expense transactions are **rejected** if the budget has insufficient
  remaining allocation.
- Transaction belongs to the user's household.

---

### US-4.2: Create an income transaction

> As a household member, I want to record an income transaction with a name,
> amount, date, account, and source, so that my account balance increases and money
> enters the unallocated funds pool.

**Acceptance Criteria:**

- Transaction is created with `type` = `income`, `name`, `amount`, `date`,
  `account_id`, `source` (required).
- `budget_id` is null.
- Optional: `instance_id`, `note`.
- **If effective** (date is today or past): account `current_balance` increases;
  unallocated pool increases.
- **If pending** (future date): no effect on balances until the date arrives (see
  US-4.6).

---

### US-4.3: Create a transfer transaction

> As a household member, I want to record a transfer between two accounts, so that
> money moves between accounts without affecting any budget.

**Acceptance Criteria:**

- Transaction is created with `type` = `transfer`, `amount`, `date`, `account_id`
  (source), `transfer_to_account_id` (destination).
- No budget is affected. Unallocated pool is not affected.
- **If effective**: source balance decreases, destination balance increases.
- **If pending**: no effect on balances until the date arrives.

---

### US-4.4: Edit a transaction

> As a household member, I want to edit a transaction's properties, so that I can
> correct mistakes.

**Acceptance Criteria:**

- Editing recalculates affected account balances and budget totals for
  **effective** transactions.
- If the budget changes, the old budget's `total_spent` is reduced and the new
  budget's is increased (for effective transactions only).
- If the amount changes, account balance and budget spent are adjusted by the
  delta (effective only).
- If the date changes from past to future, the transaction becomes pending (its
  effects are reversed). If from future to past, it becomes effective (its effects
  are applied, subject to allocation checks).
- If a linked instance is removed, the instance reverts to its previous status.

---

### US-4.5: Delete a transaction

> As a household member, I want to delete a transaction, so that an erroneous
> entry is removed.

**Acceptance Criteria:**

- Deleting an **effective** expense reverses the account balance decrease and
  budget `total_spent` increase.
- Deleting an **effective** income reverses the account balance increase and
  unallocated pool increase.
- Deleting an **effective** transfer reverses both account balance changes.
- Deleting a **pending** (future-dated) transaction has no balance/allocation side
  effects.
- If linked to an instance, the instance status reverts to `due` or `upcoming`.

---

### US-4.6: Future-dated transactions become effective on their date

> As the system, I want future-dated transactions to automatically become effective
> when their date arrives, so that account balances and budget allocations are only
> affected at the actual time of payment/receipt.

**Acceptance Criteria:**

- A transaction with a future date is stored but does **not** affect account
  balances or budget allocations until the date arrives.
- When the date arrives (or has passed on the next system check), the transaction
  becomes effective:
  - Expense: account balance decreases, budget `total_spent` increases.
  - Income: account balance increases, unallocated pool increases.
  - Transfer: both account balances adjust.
- The user does **not** need to have pre-allocated funds in the budget at the time
  of creating a future-dated expense. Allocation is only checked/enforced when the
  transaction becomes effective.
- If a future-dated expense becomes effective and the budget has **insufficient
  remaining allocation**, the system flags the budget as **overdrafted** and
  notifies the user to allocate funds immediately.
- Overdrafted budgets allow the transaction to go through (the expense is real)
  but the user is prompted/notified to resolve the negative remaining allocation.

---

## 5. Budgets and Allocations (Envelopes)

### US-5.1: Create a budget

> As a household member, I want to create a budget (envelope) with a name, so that
> I can allocate money toward a spending purpose.

**Acceptance Criteria:**

- Budget is created with `name`, `total_allocated` = 0, `total_spent` = 0.
- Budget belongs to the user's household.

---

### US-5.2: Allocate funds to a budget

> As a household member, I want to allocate money from the unallocated funds pool
> to a budget, so that I can plan my spending.

**Acceptance Criteria:**

- Allocation amount is subtracted from the unallocated pool and added to
  `budget.total_allocated`.
- Allocation is **rejected** if the requested amount exceeds the unallocated pool
  balance.
- Unallocated pool = sum of all **effective** income transactions − sum of all
  allocations ever made.

---

### US-5.3: Transfer allocation between budgets

> As a household member, I want to move allocated money from one budget to another,
> so that I can adjust my spending plan.

**Acceptance Criteria:**

- Source budget's `total_allocated` decreases by the transfer amount.
- Destination budget's `total_allocated` increases by the transfer amount.
- Transfer is **rejected** if the source budget's remaining allocation
  (`total_allocated - total_spent`) is less than the transfer amount.
- Unallocated pool is not affected.

---

### US-5.4: Deallocate funds from a budget

> As a household member, I want to return allocated money from a budget back to the
> unallocated pool, so that I can reassign it later.

**Acceptance Criteria:**

- Budget's `total_allocated` decreases by the amount.
- Unallocated pool increases by the amount.
- Deallocation is **rejected** if it would make remaining allocation negative
  (cannot deallocate already-spent money).

---

### US-5.5: Unspent allocations carry over indefinitely

> As a household member, I want unspent budget allocations to carry over without
> resetting, so that I can save up within an envelope over time.

**Acceptance Criteria:**

- No monthly or periodic reset of `total_allocated` or `total_spent`.
- Remaining allocation is always `total_allocated - total_spent`, cumulative since
  creation.

---

### US-5.6: View the unallocated funds pool

> As a household member, I want to see how much money is in my unallocated funds
> pool, so that I know how much I can still allocate.

**Acceptance Criteria:**

- Unallocated pool = (sum of all **effective** income transaction amounts) − (sum
  of all budget allocations).
- Pending (future-dated) income does **not** count toward the pool.

---

### US-5.7: Budget overdraft notification

> As a household member, I want to be notified when a budget becomes overdrafted
> (negative remaining allocation) due to a future-dated transaction becoming
> effective, so that I can allocate funds immediately.

**Acceptance Criteria:**

- When a pending expense becomes effective and causes
  `total_allocated - total_spent < 0`, the budget is flagged as overdrafted.
- A notification/flag is surfaced to the user indicating which budget is
  overdrafted and by how much.
- The overdraft does **not** block the transaction — it already happened in
  reality.
- The overdraft persists until the user allocates sufficient funds.

---

## 6. Categories (Global, Budget-Tracked)

### US-6.1: Create a category

> As a household member, I want to create a category that can be used across
> multiple budgets, so that I can track granular spending (e.g., "Bus Tickets")
> without recreating it per budget.

**Acceptance Criteria:**

- Category is created with `name` at the household level — **not** tied to a
  specific budget.
- Categories never have their own allocations.
- A category can be used in transactions across any budget.

---

### US-6.2: Assign a category to a transaction

> As a household member, I want to optionally assign a category when recording an
> expense (or within a split), so that spending is tracked at a granular level
> within the budget.

**Acceptance Criteria:**

- `category_id` is optional on expense transactions (or on individual splits).
- Category assignment does not affect allocation math — tracking only.
- The same category can appear in transactions across different budgets.

---

### US-6.3: Edit a category

> As a household member, I want to edit a category's name, so that I can keep my
> tracking structure clean.

**Acceptance Criteria:**

- Editing updates the name. All transactions referencing this category reflect the
  new name.

---

### US-6.4: Archive a category

> As a household member, I want to archive a category that has transactions
> connected to it, so that it's hidden from active selection but historical data is
> preserved.

**Acceptance Criteria:**

- Categories with connected transactions can only be **archived**, not deleted.
- Archived categories no longer appear in category selection lists.
- All transactions referencing an archived category retain the reference.
- A category with zero connected transactions may be permanently deleted.

---

## 7. Households

### US-7.1: Create a household

> As a user, I want to create a household, so that I can manage a shared budget
> with other members.

**Acceptance Criteria:**

- A household is created and the creating user becomes its owner/member.
- All entities (accounts, budgets, transactions, blueprints, instances,
  categories) belong to a household.

---

### US-7.2: Invite members to a household

> As a household owner, I want to invite other users to my household, so that we
> can manage our budget together.

**Acceptance Criteria:**

- An invitation is sent to the target user.
- The invited user can accept or decline.
- Upon acceptance, the user gains access to all household data.

---

### US-7.3: Household data isolation

> As the system, I want to ensure all data queries are scoped to the user's
> current household, so that no data leaks between households.

**Acceptance Criteria:**

- All API endpoints that return or mutate data are scoped by `household_id`.
- A user cannot access data belonging to a household they are not a member of.
- A user who belongs to multiple households can only interact with one at a time.

---

## Cross-Cutting Invariants

| ID     | Invariant                        | Test Description                                                                                                                                                       |
| ------ | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INV-1  | No bank sync                     | No endpoint or mechanism for external bank data import exists                                                                                                          |
| INV-2  | No speculative allocation        | Allocation endpoint rejects requests exceeding the unallocated pool (only effective income counts)                                                                     |
| INV-3  | No unbudgeted expense (effective) | Effective expense transactions against a budget with insufficient remaining allocation are rejected at creation time; future-dated expenses are allowed but flagged as overdraft when they become effective |
| INV-4  | Transactions are truth           | Account balances and budget totals are always derivable from the effective transaction ledger                                                                           |
| INV-5  | Blueprints are passive           | Creating/editing/deleting blueprints or instances never changes account balances or budget allocations                                                                  |
| INV-6  | Rollovers are permanent          | No scheduled job or mechanism resets budget allocations                                                                                                                 |
| INV-7  | Future-dated isolation           | Pending (future-dated) transactions do not affect account balances, budget totals, or the unallocated pool until their date arrives                                     |
| INV-8  | Household scoping                | Every data query is scoped to a household; cross-household access returns 403 or empty                                                                                 |
| INV-9  | Archive integrity                | Archived accounts, categories, and blueprints retain all linked transaction/instance data; no orphaned references                                                      |
| INV-10 | 12-month instance window         | Active blueprints always have up to 12 unhandled instances looking ahead; maintenance fills gaps without duplicating                                                    |
