---
name: apply-backend-patch
description: Apply frontend changes after a backend issue is resolved — read patch notes, update code, remove workarounds, update mocks.
---

# Apply backend patch to frontend

The backend team has resolved one or more issues. The user will provide a link to the GitHub issue(s). The updated OpenAPI spec has already been pulled into `src/api/luigi.yaml` and the API client has been regenerated from it.

## Workflow

### 1. Read the issue

Fetch the GitHub issue URL provided by the user. Read both the **issue description** (what was requested) and the **answer / patch notes** (what was actually shipped — typically in the last comment before closing). The answer is the source of truth for what changed.

### 2. Understand the generated API changes

Read the regenerated types in `src/api/generated/types.gen.ts` and, if needed, `src/api/generated/zod.gen.ts` to understand how the schema changed. **Never edit files in `src/api/generated/`** — they are read-only generated output.

### 3. Identify affected frontend code

Search for usages of the changed types, fields, or endpoints across:

- **Migrated route pages** (`src/routes/_authenticated/`)
- **Hooks** (`src/hooks/api/`)
- **Drawers** (`src/drawers/drawers/`)
- **Mock handlers** (`src/__mocks__/handlers/`)
- **Mock seed data** (`src/__mocks__/data/`)
- **Features** (`src/features/`)

Focus on **migrated pages only** (ask the user which pages are migrated if unclear). Legacy pages carry their own debt and are not updated here.

### 4. Apply changes

For each affected area:

- **Remove workarounds**: Delete any frontend code that was compensating for the now-fixed backend gap (e.g., using `transactionId` when a proper `transaction` relation is now available).
- **Align with new contract**: Update field accesses, type references, and data mappings to use the new schema shape. Follow existing patterns in the codebase — e.g., if bills already use a `transaction` relation ref, income should too.
- **Update mock handlers**: Add enrichment functions or update existing ones so mock responses match the new backend shape. Follow the existing enrichment pattern (e.g., `enrichBillInstance` in `src/__mocks__/handlers/bills.ts`). Internal mock storage can keep old fields; enrichment resolves them on read.
- **Update mock seed data types**: If the internal mock type in `src/__mocks__/data/index.ts` needs new fields for storage, add them. If the change is response-only (resolved via enrichment), the seed type stays as-is.
- **Clean up dead code**: Remove unused imports, variables, helper functions, and comments that only existed because of the old workaround.

### 5. Verify

- Run linter checks on all modified files.
- Confirm no remaining references to the old workaround pattern exist in migrated code.
- Do **not** touch `src/api/generated/` files.

### 6. Report

Summarize:
- What the backend changed (from the patch notes)
- What frontend files were updated and why
- Any remaining TODO items or follow-up tickets needed
