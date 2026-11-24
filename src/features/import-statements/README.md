# Import Statements

Frontend-only bank statement import flow for `.xlsx` files. Files are parsed in
browser with SheetJS (`xlsx`); raw statement files are not uploaded or persisted.

## User Flow

1. Transactions page action opens a hidden file picker. Several statement
   files (one per account) can be chosen at once.
2. `StatementFileInput` validates `.xlsx`, parses each file, stores the parsed
   statements in in-memory session state, then route code navigates to
   `/transactions/import`. A file that cannot be parsed is reported and skipped.
3. Import page converts parsed rows into editable `TransactionDraft`s once
   account, recipient, sender, category, and budget lookups and the last year
   of saved transactions are loaded. While doing so it:
   - fills recipient/sender, category, budget, and transfer account from the
     latest saved transaction with the same bank text (see Auto-fill);
   - excludes rows that are already saved (see Already Imported Rows);
   - pairs money moved between two uploaded accounts into one transfer (see
     Transfers Between Uploaded Statements).
4. User reviews four sections:
   - Uncategorized
   - Incomes
   - Transfers
   - Expenses
5. User can edit rows inline, bulk edit selected rows per table, exclude/include
   rows, or switch files with `Byt filer`.
6. Submit checks effective-dated expense totals per budget. Budgets that fall
   short are topped up with exactly what is missing from the unallocated pool
   (including the incomes in this import) without asking; a toast says what was
   allocated. Only when the pool is not enough does a dialog open, listing the
   budgets with allocation to spare so the rest can be moved from them. Import
   then runs in order: incomes → allocations from the pool → moves between
   budgets → transfers and expenses.

## Important Boundaries

- Raw files stay local to browser.
- Parsed data is held in memory only via `session.ts`.
- No generated API code is edited.
- Inline catalog creation (new sender, recipient, or category) is supported in
  both inline table comboboxes and the bulk edit dialog. Values map to bulk API
  fields (`newCategory`, `newRecipientName`, `newIncomeSourceName`) via
  `build-bulk-create-request.ts` and the shared create-transaction mappers.
- Empty income, transfer, and expense tables remain visible. Empty
  uncategorized table is hidden.

## Core Files

- `types.ts` - shared import types (`StatementParseResult`, `TransactionDraft`,
  `InvalidStatementRow`, lookup item shape).
- `parser.ts` - `.xlsx` parsing and header normalization.
- `session.ts` - in-memory handoff of the parsed statements between
  transactions page and import route.
- `import-drafts.ts` - converts parsed statements into editable drafts using
  current household lookups and saved transactions.
- `already-imported.ts` - finds statement rows that already exist as saved
  transactions, and the latest saved transaction per account.
- `transfer-pairing.ts` - pairs the two sides of a transfer across uploaded
  statements.
- `build-bulk-create-request.ts` - maps reviewed drafts to bulk create API body.
- `submit-import.ts` - ordered import submit (incomes, budget cover, rest).
- `import-budget-shortfalls.ts` - expense shortfall detection. How shortfalls
  are covered is shared with the transaction drawers:
  `drawers/create-transaction-drawer/budget-cover-plan.ts` and
  `hooks/use-budget-cover-dialog.tsx`.
- `accounts.ts` - account number normalization and matching.
- `classification/classify-transaction.ts` - income/expense/transfer
  classification.
- `classification/bank-description.ts` - strips purchase date, contactless
  marker, and city from bank text; gives the vendor key used for matching.
- `classification/history-matching.ts` - what saved transactions say about a
  vendor key, recipient, sender, or transfer text.
- `classification/assignment-rules.ts` - auto-assignment from descriptions to
  existing entities: saved history first, then built-in rules, recipient name
  inside the bank text, and Fuse.js as last resort.
- `classification/instance-matching.ts` - auto-links rows to bill/income
  instances and ranks instances for the manual picker.
- `utils/date.ts` - statement date parsing.
- `utils/money.ts` - Swedish money parsing/formatting.

## Components

- `components/statement-file-input.tsx` - hidden file picker used by both
  transactions page and import summary.
- `components/summary.tsx` - per file: name, origin account selector, and the
  latest saved transaction on that account; file switcher, row counts, amount
  info cards, and how many rows were excluded as already saved or paired.
- `components/uncategorized-table.tsx` - rows needing classification.
- `components/incomes-table.tsx` - income rows.
- `components/transfers-table.tsx` - transfer rows.
- `components/expenses-table.tsx` - expense rows.
- `components/import-draft-table.tsx` - shared DataTable implementation used by
  all four table components.
- `components/import-table-fields.tsx` - shared draft controls (`DraftCombobox`,
  native selects/inputs, combobox ↔ draft field helpers).
- `components/footer.tsx` - submit readiness summary and import button.

Bulk edit dialog lives outside the feature under:

- `src/dialogs/import-statements/import-bulk-edit-dialog.tsx`

## Catalog Fields (Comboboxes)

Income and expense tables use `DraftCombobox` with `allowCreate` for catalog
fields. Transfer tables use plain text or selects for accounts only — category,
sender, and recipient do not apply to transfers.

| Table | Combobox fields (inline + bulk edit) |
| --- | --- |
| Income | Sender, Category |
| Expense | Recipient, Category |

Bulk edit leaves a field unchanged when its combobox shows the “no change”
placeholder (null value). Choosing an existing catalog entry or creating a new
name applies that value to all selected rows. Creating a new sender or recipient
clears instance links on affected rows because instances require existing catalog
ids.

## Parsing Notes

The parser reads the first worksheet and expects a transaction header row with
date, description, and amount columns. Header matching is normalized so spacing,
punctuation, dots, casing, and Swedish diacritics are tolerated.

Supported data examples:

- Account number from `Kontonummer`.
- Date headers such as `Bokf. datum`.
- Description header `Beskrivning`.
- Amount header `Belopp`.
- Balance/saldo columns ignored.

Malformed rows are collected as `invalidRows` and shown in the footer. If no
valid transactions are found, parsing fails with a translated error toast.

## Auto-fill From Saved Transactions

The bank text of a card purchase looks like
`2026-11-18 kontaktlös ICA KVANTUM STORTORGET, GOTEBORG`. Only the vendor part
is stable, so `cleanBankDescription` reduces it to the key
`ICA KVANTUM STORTORGET`. Saved transactions keep the bank text as their name
unless the user renames them, so the same key can be computed for history.

For each row, in order:

1. Built-in rules (`ASSIGNMENT_RULES`).
2. The latest saved transaction with the same key decides recipient/sender,
   category, and budget. This overrides the rules: the user's own last choice
   wins, so correcting a vendor once is enough.
3. Without a recipient: a recipient whose whole name appears in the vendor
   text (`Coop` in `STORA COOP CENTRUM`), then fuzzy search.
4. Category and budget still empty are copied from the latest saved
   transaction to that recipient (or from that sender).

Transfers get the other account from an account number in the text, else from
the latest saved transfer with the same text on that account. Archived or
deleted choices and split transactions are never copied.

Renaming a saved transaction removes its bank text, so that transaction no
longer teaches the key (step 4 still works through its recipient).

## Already Imported Rows

`markAlreadyImported` excludes a row when a saved transaction on the same
account has the same amount and direction on the row's booking date, else its
purchase date, else (only for transactions linked to a bill/income instance,
whose date moves to the due date) within seven days. One saved transaction
covers one row. Excluded rows are labelled `Finns redan` and can be included
again. The summary shows the latest saved transaction per account, so the same
or an overlapping period can be uploaded without tracking dates.

## Transfers Between Uploaded Statements

`pairTransfersAcrossStatements` matches an outgoing row in one statement with
an incoming row of the same amount in another statement (different account):
same day when both look like transfers; same day when one looks like a
transfer and the other is neither a card purchase nor a recognized
vendor/sender; up to three days apart when both look like transfers. The
outgoing row is imported with both accounts filled in; the incoming row is
excluded and labelled `Ihopparad`. An expense and an income that only share an
amount are not paired.

Changing a file's origin account before any row is edited redoes the whole
analysis. After manual edits only the account fields move, to keep the edits.

## Instance Picker

The picker ranks unlinked instances for the row instead of listing them all:
likely matches are the instance of each recurring bill/income closest in date
(within 45 days) whose recipient/name matches the row or whose amount is within
8 %. Without likely matches the five best-ranked are shown. `Visa alla` reveals
the full ranked list.

## Account Matching

`accounts.ts` strips whitespace, dots, and dashes from both statement account
numbers and user account identifiers. A match occurs when the user's account
identifier appears anywhere inside the statement account number. Ambiguous
matches are left blank so user must choose manually.

## Table Behavior

- Rows are always sorted by file, then source row number.
- With several files, income/expense tables show an account column.
- Column sorting is disabled in import tables.
- Row selection is scoped per table.
- Excluded rows cannot be selected for bulk edit.
- Excluded rows keep a muted style and do not show hover highlight.
- Include/exclude is controlled by the save/save-off icon button at row end.
- Changing transaction type moves row to correct table.
- Typed rows cannot be changed back to `uncategorized`.
- Income category column always shows a category combobox — never the origin
  account name (transfer-style display is limited to transfer tables).

## Tests

Focused Vitest coverage exists for pure logic:

- `accounts.test.ts`
- `already-imported.test.ts`
- `import-drafts.test.ts`
- `transfer-pairing.test.ts`
- `classification/bank-description.test.ts`
- `classification/history-matching.test.ts`
- `classification/instance-matching.test.ts`
- `classification/classify-transaction.test.ts`
- `classification/assignment-rules.test.ts`
- `utils/date.test.ts`
- `utils/money.test.ts`

Run:

```bash
npm run test -- src/features/import-statements
```
