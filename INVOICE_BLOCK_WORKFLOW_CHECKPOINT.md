# Invoice Block Workflow Checkpoint

Date: 2026-02-24

## Scope Implemented

This checkpoint implemented three related invoice-block capabilities:

1. Add existing work to an **active invoice block**.
2. Create a **new invoice block from selected existing work** (entries/projects).
3. Track post-completion status on historical blocks as **Submitted** and **Paid**.

## Product Decisions Used

Confirmed requirements applied in this implementation:

- Project selection uses **live link behavior**:
  - Current unassigned project entries are added immediately.
  - Future entries for linked projects auto-attach while block is active.
- New block from work uses **auto-filled target hours** (editable).
- Status updates are **manual**.
- Both billable and non-billable entries are eligible.
- Legacy `COMPLETED` history should behave as `SUBMITTED` going forward.

## Data Model Changes

Updated `prisma/schema.prisma`:

- `InvoiceBlockStatus` enum now includes:
  - `SUBMITTED`
  - `PAID`
- `TimeEntry` now has optional:
  - `invoiceBlockId`
  - relation to `InvoiceBlock`
- Added new model `InvoiceBlockProject` for project-to-block live links.
- `InvoiceBlock` now has relations:
  - `timeEntries`
  - `projectAssignments`

## Migrations Added

1. `prisma/migrations/20260224121500_invoice_block_assignments_and_statuses/migration.sql`
   - Adds enum values `SUBMITTED`, `PAID`.
   - Adds `TimeEntry.invoiceBlockId`.
   - Creates `InvoiceBlockProject` table + indexes + FKs.
   - Backfills `TimeEntry.invoiceBlockId` from previous date-range behavior.

2. `prisma/migrations/20260224123000_mark_legacy_completed_blocks_submitted/migration.sql`
   - Converts legacy `InvoiceBlock.status = COMPLETED` rows to `SUBMITTED`.
   - Separated into a second migration to avoid Postgres enum transaction ordering issue.

## Server-Side Behavior Changes

### Invoice block hours calculation

`src/server/data/invoice-blocks.ts`

- `calculateBlockHours(...)` now calculates hours from explicitly assigned entries (`TimeEntry.invoiceBlockId`) instead of date ranges.
- Active/history block progress now uses explicit assignment totals.

### New invoice block actions

`src/server/actions/invoice-blocks.ts`

Added:

- `getInvoiceBlockWorkOptions(clientId, blockId?)`
  - Returns assignable entries/projects for selection UIs.
- `assignWorkToInvoiceBlock({ blockId, entryIds, projectIds })`
  - Adds selected entries to active block.
  - Links selected projects for live behavior.
  - Assigns current unassigned entries for those projects.
- `createInvoiceBlockFromWork({ clientId, entryIds, projectIds, hoursTarget?, notes? })`
  - Creates active block from selected work.
  - Defaults target hours from selected total when not explicitly provided.
- `updateInvoiceBlockStatus(blockId, status)`
  - Manual status transitions on non-active blocks (`COMPLETED`/`SUBMITTED`/`PAID`).

Retained:

- Existing `createInvoiceBlock`, `updateInvoiceBlock`, `resetInvoiceBlock`, `deleteInvoiceBlock` flows.

### Live project auto-assignment on new entries

`src/server/actions/time-entries.ts`

- Added logic to resolve active linked block by project (`InvoiceBlockProject` + `ACTIVE` block).
- New entries (timer start/manual log) auto-set `invoiceBlockId` when project is linked.
- Entry updates can attach newly selected project-linked entries if entry was previously unassigned.

## UI Changes

### New components

- `src/components/custom/InvoiceBlockWorkDialog.tsx`
  - Action on active block: **Add Work**
  - Multi-select entries/projects, with project live-linking.
  - Includes summary + selection shortcuts.

- `src/components/custom/CreateInvoiceBlockFromWorkDialog.tsx`
  - Action for clients without active block: **Create From Work**
  - Multi-select entries/projects.
  - Target hours auto-filled from selected work and editable.

### Updated components

- `src/components/custom/InvoiceBlockCard.tsx`
  - Added `Add Work` action button.

- `src/components/custom/ClientsList.tsx`
  - Added `Create From Work` entry points (with and without history view).

- `src/components/custom/CreateInvoiceBlockDialog.tsx`
  - Copy updated to clarify new blocks start empty.

- `src/components/custom/InvoiceBlockHistory.tsx`
  - Status badge display for historical blocks.
  - Manual status actions:
    - `Completed -> Submitted`
    - `Submitted -> Paid`

- `src/types.ts`
  - Added `Submitted` and `Paid` to `InvoiceBlockStatus`.

## Changelog Entries

Updated `CHANGELOG.md` under `## [Unreleased]` with:

- Added: assignment tools, create-from-work flow, submitted/paid controls.
- Changed: explicit assignment tracking, empty block start behavior, dialog UX polish.
- Fixed: migration ordering note for enum conversion.

## Validation Performed

Executed and passed during implementation:

- `npx prisma generate`
- `npx tsc --noEmit`
- Targeted eslint on changed files

Note: full-repo `npm run lint` still includes pre-existing unrelated lint failures in older files.

## Current Behavior Summary (Important)

- Block usage now depends on explicit assigned entries, not implicit date range.
- New plain blocks start at `0.0h` until work is attached.
- Linked projects keep feeding future entries into the active block.
- Entries already assigned to other blocks are not reassigned by selection actions.

## Suggested Next UI Iterations

Potential follow-ups for future sessions:

1. Add filters/search inside work-selection dialogs (date range, project filter, text search).
2. Add explicit “Unlink project” and “Remove entry from block” controls.
3. Add bulk select by date ranges (e.g., “this week”, “last month”).
4. Add invoice metadata fields (invoice number, submitted date, paid date, payment amount).
5. Add dedicated invoicing/report export view from block contents.

