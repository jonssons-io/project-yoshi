# Import Statements

Frontend-only bank statement import flow for `.xlsx` files. Files are parsed in
browser with SheetJS (`xlsx`); raw statement files are not uploaded or persisted.

## User Flow

1. Transactions page action opens a hidden file picker.
2. `StatementFileInput` validates `.xlsx`, parses file, stores parsed result in
   in-memory session state, then route code navigates to `/transactions/import`.
3. Import page converts parsed rows into editable `TransactionDraft`s once
   account, recipient, sender, category, and budget lookups are loaded.
4. User reviews four sections:
   - Uncategorized
   - Incomes
   - Transfers
   - Expenses
5. User can edit rows inline, bulk edit selected rows per table, exclude/include
   rows, or switch file with `Byt fil`.
6. Submit checks effective-dated expense totals per budget. When short, a dialog
   lets the user allocate from the current unallocated pool plus queued import
   incomes. Import then runs in order: incomes → budget allocations → transfers
   and expenses.

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
- `session.ts` - in-memory parsed statement and file name handoff between
  transactions page and import route.
- `import-drafts.ts` - converts parsed rows into editable drafts using current
  household lookups.
- `build-bulk-create-request.ts` - maps reviewed drafts to bulk create API body.
- `submit-import.ts` - ordered import submit (incomes, allocations, rest).
- `import-budget-shortfalls.ts` - expense shortfall detection for allocation dialog.
- `accounts.ts` - account number normalization and matching.
- `classification/classify-transaction.ts` - income/expense/transfer
  classification.
- `classification/assignment-rules.ts` - auto-assignment from descriptions to
  existing entities, including Fuse.js recipient matching.
- `utils/date.ts` - statement date parsing.
- `utils/money.ts` - Swedish money parsing/formatting.

## Components

- `components/statement-file-input.tsx` - hidden file picker used by both
  transactions page and import summary.
- `components/summary.tsx` - file name, file switcher, origin account selector,
  row counts, and amount info cards.
- `components/import-allocation-dialog.tsx` - budget allocation when expenses
  exceed remaining envelope amounts.
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

## Account Matching

`accounts.ts` strips whitespace, dots, and dashes from both statement account
numbers and user account identifiers. A match occurs when the user's account
identifier appears anywhere inside the statement account number. Ambiguous
matches are left blank so user must choose manually.

## Table Behavior

- Rows are always sorted by source row number from the file.
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
- `classification/classify-transaction.test.ts`
- `classification/assignment-rules.test.ts`
- `utils/date.test.ts`
- `utils/money.test.ts`

Run:

```bash
npm run test -- src/features/import-statements
```
