# Household Budgeting App — Project Brief

## Purpose

This document serves as the foundational brief for the household budgeting app.
It is intended to guide AI models and developers in creating user stories,
flowcharts, technical documentation, and architectural decisions.

---

## Background & Research Summary

Before deciding on a direction, the following budgeting systems were evaluated:

- **Envelope System** — Divide money into spending categories (envelopes).
  Spending reduces the envelope balance. Simple and intuitive, but limited
  forecasting on its own.
- **Zero-Based Budgeting (ZBB)** — Every dollar of income is assigned a job.
  Income minus allocations equals zero. Very intentional and pairs well with
  envelopes.
- **Forecast-Based Budgeting** — Models future balances based on recurring
  expenses and income. Great for long-term planning.
- **Category Tracking / Soft Budgeting** — Set category limits and track
  against them. Low friction but poor spending discipline.
- **Paycheck Budgeting** — Budget per paycheck. Useful for irregular income.
- **Values-Based / Goal-Driven Budgeting** — Goals drive the budget structure.
- **Historical Average Budgeting** — Past spending informs future allocations.
  Especially useful for utilities and seasonal expenses.

### Chosen Approach

The app is built around **Zero-Based Budgeting combined with the Envelope
System**, with **Historical Analytics and Forecasting** added in Phase 2.

Core ZBB rules the app enforces:

1. Every dollar must be assigned.
2. Categories (budgets/envelopes) represent planned spending.
3. Money can be moved between envelopes.
4. Unspent money carries over indefinitely.

---

## Target Users

- Individuals
- Couples and households

---

## Key Design Principles

- Manual transaction entry only (no bank sync).
- Hybrid usage — intentional but not overly rigid.
- Planning ahead is a primary feature, not an afterthought.
- Historical data should inform future budgeting.
- Real-life data and planning/simulation data are always kept separate.
- Nothing affects account balances or budget allocations until a real
  transaction is recorded.

---

## Phased Development Plan

---

## Phase 1 — Core Budgeting

### 1. Accounts

Accounts represent real-world bank accounts or cash holdings.

**Behavior:**

- Users create accounts with an initial balance reflecting their real current
  bank balance at the time of setup.
- Account balances are updated exclusively through transactions and transfers
  created manually in the app, based on the user's real bank statements.
- There is no automatic bank synchronization.

**Example flow:**

1. User creates "Main Checking" with an initial balance of €2,400.
2. User goes grocery shopping and spends €47.
3. User returns home and manually creates a transaction of −€47 in the app,
   assigned to the Food budget.
4. Account balance updates to €2,353. Food budget balance reduces by €47.

**Key rules:**

- Initial balance is set once at account creation.
- All subsequent balance changes come from transactions or transfers.
- Transfers between accounts move money without affecting budgets.

---

### 2. Bills and Income Tracking

Bills and incomes follow a **Blueprint → Instance** model.

#### Blueprints

A blueprint is the definition of a recurring or one-time bill or income.

**Blueprint properties:**

- Name
- Amount
- Type (bill or income)
- Recurrence (one-time, weekly, monthly, yearly, custom)
- Start date
- Linked account (optional)
- Linked budget (optional, for bills)

When a blueprint is created, the system automatically generates **instances**
based on the recurrence rule.

#### Instances

An instance represents a single expected occurrence of a bill or income at a
specific point in time.

**Instance states:**

- `Upcoming` — Not yet due.
- `Due` — Due date has arrived, no transaction connected.
- `Handled` — A transaction has been connected to this instance.

**Connecting a transaction to an instance:**

- When a user records a transaction, they can link it to an instance.
- Linking marks the instance as `Handled`.
- The app then reflects the next upcoming instance as the next expected payment
  or income.

**Editing rules:**

- Editing a **blueprint** applies changes to all upcoming instances (and
  optionally to past instances if the user confirms).
- Editing an **instance** applies changes to that instance only. The blueprint
  and all other instances remain unchanged.

**Important constraints:**

- Blueprints and instances are for **tracking and visibility only** in Phase 1.
- They do **not** add or subtract money from budgets or accounts.
- Money only moves when a real transaction is recorded.
- Phase 2 will use blueprint/instance data for planning and estimations.

**Example:**

- Blueprint: "Electricity Bill", monthly, ~€110.
- Instances are generated for each month.
- In March, the bill arrives for €118. User creates a transaction for −€118
  and links it to the March electricity instance.
- The March instance is marked `Handled`. April instance shows as next
  upcoming.

---

### 3. Transactions

Transactions are the single source of truth for all money movement in the app.

**Transaction types:**

- **Expense** — Subtracts from an account and from a budget allocation.
- **Income** — Adds to an account and to the unallocated funds pool.
- **Transfer** — Moves money between accounts. Does not affect budgets.

**Transaction properties:**

- Amount
- Date
- Account
- Type (expense / income / transfer)
- Budget (required for expenses)
- Category (optional, sub-budget tracking)
- Linked bill/income instance (optional)
- Note / memo

**Behavior:**

- Expense transactions reduce the account balance and the linked budget's
  remaining allocation.
- Income transactions increase the account balance and add to the unallocated
  funds pool (not to a budget directly).
- Transfer transactions adjust two account balances with no budget impact.
- If linked to a bill or income instance, the instance is marked `Handled`.

---

### 4. Budgets and Allocations (Envelopes)

Budgets are envelopes that hold allocated money for a specific spending purpose.

**Unallocated Funds Pool:**

- All income transactions feed into a shared unallocated funds pool.
- This pool represents money that exists in accounts but has not yet been
  assigned to a budget.

**Allocation rules:**

- Users manually allocate money from the unallocated pool into budgets.
- A user **cannot allocate money that does not exist** in the unallocated pool.
  Allocation is limited to real available funds.
- A user **cannot spend from a budget** that has no remaining allocation.
- Allocations can be transferred between budgets at any time. Example: move
  €40 from Transportation to Food if needed.
- Unspent allocated money **carries over indefinitely**. There is no monthly
  reset.

**Budget properties:**

- Name
- Total allocated (cumulative)
- Total spent
- Remaining allocation

**Example flow:**

1. User receives salary of €3,000. Transaction recorded → account +€3,000 →
   unallocated pool +€3,000.
2. User allocates: Food €400, Rent €950, Utilities €150, Savings €300,
   Transportation €100, Remaining unallocated €1,100.
3. User spends €47 on groceries → Food budget reduces by €47 → Food remaining:
   €353.
4. User overspends on food and needs €50 more → transfers €50 from
   Transportation to Food.

---

### 5. Categories (Sub-Budget Tracking)

Categories are optional subdivisions within a budget for more granular
tracking.

**Example:**

- Budget: Food
  - Category: Groceries
  - Category: Fast Food
  - Category: Snacks

**Behavior:**

- A transaction assigned to a budget can optionally be assigned a category.
- Category data is used for tracking and, in Phase 2, for insights.
- Categories do not hold their own allocations in Phase 1. Allocation lives at
  the budget level.

---

## Phase 2 — Insights and Planning

Phase 2 extends the app with two non-destructive layers built on top of Phase 1
data. Phase 2 features **never affect real account balances, budget allocations,
or transaction history**.

### Insights (Historical Analytics)

Powered by accumulated transaction and instance data from Phase 1.

**Examples:**

- Monthly spending per budget and category over time.
- Year-over-year comparison per budget/category.
- Seasonal patterns (e.g., electricity higher in winter).
- Average monthly cost per bill, automatically suggested as a future
  allocation.
- Spending trends and anomalies.

**Example:**

> Electricity — last 12 months:  
> Jan €120, Feb €135, Mar €110, Jun €65, Dec €190  
> Annual total: €1,320 | Suggested monthly allocation: €110

### Planning (Forward Simulation)

A separate planning section where users can model future budgets and scenarios.

**Rules:**

- Planning data is completely isolated from real data.
- Changes in the planning section do not affect accounts, budgets, or
  transactions.
- Blueprint/instance data from Phase 1 feeds into the planner as a starting
  point.
- Users can project future balances, simulate allocation strategies, and plan
  for large upcoming expenses.

---

## Data Model Overview (Phase 1)

**Account**

- id
- name
- type (checking | savings | cash)
- initial_balance
- current_balance

**Transaction**

- id
- account_id
- type (expense | income | transfer)
- amount
- date
- budget_id (nullable)
- category_id (nullable)
- instance_id (nullable)
- note
- transfer_to_account_id (nullable)

**Blueprint**

- id
- name
- type (bill | income)
- amount
- recurrence (one_time | weekly | monthly | yearly | custom)
- start_date
- account_id (nullable)
- budget_id (nullable)

**Instance**

- id
- blueprint_id
- due_date
- amount
- status (upcoming | due | handled)
- transaction_id (nullable)

**Budget**

- id
- name
- total_allocated
- total_spent

**Category**

- id
- budget_id
- name

**UnallocatedPool**

- total_available (derived: sum of income transactions − sum of allocations)

---

## Core Constraints Summary

| Rule                    | Detail                                                 |
| ----------------------- | ------------------------------------------------------ |
| No bank sync            | All data is entered manually                           |
| No speculative money    | Cannot allocate funds not yet received                 |
| No unbudgeted spending  | Cannot spend from a budget with no allocation          |
| Transactions are truth  | Nothing moves until a transaction is recorded          |
| Blueprints are passive  | Instances do not affect balances, only transactions do |
| Rollovers are permanent | Unspent allocations never expire                       |
| Planning is isolated    | Phase 2 planning never touches real data               |

---

## Summary for AI Model Guidance

When generating user stories, flowcharts, or architecture from this document:

1. Follow the **Blueprint → Instance → Transaction** chain strictly.
2. Enforce the **Unallocated Pool** as the only source of budget allocations.
3. Treat **transfers between accounts** and **transfers between budgets** as
   distinct operations.
4. Phase 1 must be fully functional and self-contained before Phase 2 begins.
5. Phase 2 reads Phase 1 data but never mutates it.
6. Design for **households** — multiple users may share the same data.
7. Prioritize **clarity of money state** at all times: where is each dollar,
   what is it assigned to, and what has been spent.
