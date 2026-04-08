---
name: apply-frontend-fix
description: Implement a frontend-only bugfix or enhancement — no backend or OpenAPI changes; align with app patterns and verify.
---

# Apply frontend fix

The issue is **entirely in the frontend**: UI, client-side logic, routing, TanStack Query usage, form validation, accessibility, performance, or mocks. There is **no** backend contract change, no update to `src/api/luigi.yaml`, and **no** regeneration of `src/api/generated/**`.

## Before you start

- Read `@.cursor/rules/ui-overhaul-migration.mdc` (migrated page shell, drawers, data tables, component placement, TanStack Query pitfalls, etc.).
- The user will link a **GitHub issue in this repository (project-yoshi)**. **Read it with the GitHub CLI** from the repo — e.g. `gh issue view <issue-url>` or `gh issue view <number>` (uses this repo’s default remote when run in the project-yoshi workspace; add `-R <owner>/project-yoshi` if needed). Do not rely on guessing the issue body; use `gh` output as the source of truth. If they paste free-form notes instead of a link, use those.

## Workflow

### 1. Read the report

Understand **expected vs actual** behavior and **acceptance criteria** from the `gh issue view` output (and any closing comment or linked PR that describes the intended fix).

### 2. Locate affected code

Search and narrow to the relevant **routes**, **components**, **hooks** (`src/hooks/`), **drawers** (`src/drawers/drawers/`), **features** (`src/features/`), or **lib** helpers.

- Prefer **migrated** surfaces (`PageLayout`, typed drawers, `useDataTable` / `DataTable`) per project rules; do not expand scope into unrelated legacy pages unless the issue explicitly targets them.
- **Do not** edit `src/api/generated/**` — it is unchanged for this work.

### 3. Implement the fix

- Match existing patterns (imports via `@/`, TanStack Query rules, form + Zod, shadcn through wrappers not raw `ui/` in new code).
- Keep the change **minimal**: only what the issue requires; no drive-by refactors.
- If behavior changes what MSW returns or the shape consumed by the app, update **`src/__mocks__/handlers/`** and **`src/__mocks__/data/`** accordingly. If mocks stay API-accurate and unchanged, leave them alone.

### 4. Verify

- Run **Biome** on modified files (`npm run lint` or project check command).
- Run **tests** if the change touches logic covered by Vitest (`npm run test` as appropriate).
- Confirm **no** edits under `src/api/generated/`.

### 5. Report

In the ticket, write a response/answer using the gh cli.
Summarize:

- What was wrong and how the fix addresses it
- Which files changed and why
- Any follow-ups (e.g. separate ticket for a larger refactor) only if truly necessary
