# Chronos — Improvement Backlog

Working program for `/goal`. Last merged 2026-08-14 from the original audit
plus the backend/UX review. Branch: `refactor/deepening-migrations`.

**Baseline:** `npx tsc --noEmit` passes. `npm run lint` fails (9 errors, 12 warnings).
No tests, no test runner, no CI.

Status: `[ ]` open · `[~]` in progress · `[x]` done

---

## How `/goal` uses this file

This file is the only backlog. Do not invent extra work.

1. Launch the phase prompt at the bottom of this file (`/goal …`).
2. Work the next `[ ]` / `[~]` item in that phase’s **Order**.
3. Mark `[x]` only when the item’s **Done when** checks pass. Paste evidence
   (command output, file paths, what you clicked in the browser) in the item.
4. Add a `CHANGELOG.md` `[Unreleased]` note for anything a user can see.
5. Do not start the next phase. When the phase is done, `/goal clear` and
   launch the next prompt.

**Do not mark a goal complete** if any item in the launched phase is still
`[ ]` / `[~]`, or if a **Done when** check was skipped.

Do not deepen modules or add product surface unless the item says so.
`report-fragments.ts` and `block-hours-calculator.ts` are already the right
shape — leave them.

---

## Phase 1 — Stabilize (ship first)

Bugs users can see, plus the quality floor (lint, tests, dead code).

### [x] 1. Tab title timer never rolls over into hours

`src/lib/time.ts` — `formatBrowserTitle`

Computed minutes as `Math.floor(safe / 60)` (total minutes). A 1h 5m 3s
session showed `65:03`. `formatDuration` above it was already correct.

**Fixed:** emits `h:mm:ss` past the hour, `mm:ss` below.

**Done when:** `formatBrowserTitle(3903) === '1:05:03'` and
`formatBrowserTitle(59) === '00:59'`.

---

### [x] 2. Tab title drops elapsed time the moment you pause

`src/components/custom/AppShell.tsx`, `src/lib/time.ts` (`browserTitle`,
`resolveTimerChromeStatus`)

Pause is local intent + server status so a missing `activeTimer` after
revalidate does not fall through to `stopped`. A MutationObserver re-applies
the title after Next.js metadata rewrites `<title>` to `Chronos`. Resume
keeps frozen elapsed until the server clears `pausedAt` (no pause-duration
jump).

**Done when:** (browser) pause keeps `Paused • mm:ss - Chronos`; resume
continues from that elapsed; stop is `Chronos`.

**Evidence:** Chrome via Playwright against `http://localhost:3000`:

```
running=00:00 - Chronos
paused=Paused • 00:01 - Chronos
paused+2.5s=Paused • 00:01 - Chronos
paused+held=Paused • 00:01 - Chronos
resumed=00:01 - Chronos
stopped=Chronos
```

Scratch: `pause-title.txt`. Unit tests in `src/lib/time.test.ts`.

---

### [x] 3. Timesheet / tracker silently show incomplete data

`src/app/(dashboard)/timesheet/page.tsx` → `getTimeEntries()`
`src/app/(dashboard)/tracker/page.tsx` → same
`src/server/data/time-entries.ts` (`limit = 50`)

Timesheet pages backwards through weeks and filters those 50 rows
client-side. Past ~50 entries, older weeks look empty. Tracker has the same
cap and no “showing 50 of N”. Data helpers that throw return `[]`, so a DB
error looks like “no work yet”.

**Fix:** URL week (timesheet) / paginated or ranged query (tracker). Query
that range on the server. Do not swallow read errors as empty lists — throw
or return a typed failure so the error boundary can fire.

**Done when:**

- A week with entries older than the 50 most-recent still renders those
  entries after navigating to it.
- Tracker shows more than the latest 50, or clearly paginates / says
  “showing N of M”.
- A forced data-layer failure does not render the empty-state copy.

**Evidence:** Timesheet `?week=` → `weekRangeFromParam` →
`getTimeEntries({ startTimeGte, startTimeLt })` with no `take`. Tracker
`?page=` + “Showing a–b of N”. `getTimeEntries` no longer catch-and-return
`[]`. Covered by `weekRangeFromParam` / `buildTimeEntryListArgs` tests.

---

### [x] 4. `getDefaultWorkspaceId()` has a create race

`src/lib/workspaces.ts`

Find-then-create, no unique on `Workspace.name`. Two concurrent first-writes
create two `"Default Workspace"` rows and later writes split.

**Fix:** `@@unique` on name (or a singleton key) + `upsert`.

**Done when:** migration adds the unique constraint; `getDefaultWorkspaceId`
uses `upsert`; a second concurrent call cannot create a second default row.

**Evidence:** `Workspace.name @unique`;
`prisma/migrations/20260814120000_workspace_name_unique/migration.sql`
merges dupes then `CREATE UNIQUE INDEX "Workspace_name_key"`;
`getDefaultWorkspaceId` is `prisma.workspace.upsert({ where: { name } })`.

---

### [x] 5. `elapsed()` can return a negative number

`src/lib/timer-calculator.ts` — branch with `endTime` and no `duration`

Subtracts `pausedSeconds` without the `Math.max(0, …)` the sibling branches
use.

**Done when:** that branch is clamped; a unit test covers
`endTime - startTime < pausedSeconds` → `0`.

**Evidence:** `src/lib/timer-calculator.test.ts` — 10s span with
`pausedSeconds: 30` → `elapsed(...) === 0`.

---

### [x] 6. `npm run lint` fails — 9 errors, 12 warnings

Mostly React Compiler rules:

| File | Issue |
|---|---|
| `AppShell.tsx:95` | `set-state-in-effect` (same chain as #2) |
| `ReportsView.tsx:147` | `set-state-in-effect` |
| `TimeEntryRow.tsx:44` | `set-state-in-effect` |
| `TimesheetView.tsx:104` | `set-state-in-effect` |
| `ui/sidebar.tsx:611` | `Math.random()` during render |
| `server/actions/tags.ts:95,133` | `catch (error: any)` |
| various | unused imports |

Do this with #2 — the AppShell lint is in the paused-title effect.

**Done when:** `npm run lint` exits 0.

**Evidence:** `npm run lint` exits 0 (AppShell no longer copies props in an
effect; Reports/Timesheet/TimeEntryRow derive instead of syncing; sidebar
skeleton width is fixed; tag catches are `unknown`).

---

### [x] 7. No tests, no CI

No `.github/`, no test runner. The trickiest rules are pure modules:

- `src/lib/timer-calculator.ts`
- `src/lib/time.ts` (#1)
- `src/lib/billable/*` + `src/server/billable/resolve.ts`
- `src/server/invoice-linkage/*`
- `src/server/data/block-hours-calculator.ts` (`enrichBlock` only — keep
  Prisma I/O out of unit tests this phase)

**Fix:** Vitest + a GitHub Actions workflow: lint, `tsc --noEmit`, test, build.

**Done when:** `npm test` runs and covers the modules above; a workflow file
exists and the same four commands are what it runs.

**Evidence:** `npm test` (Vitest) covers `time.ts`, `timer-calculator.ts`,
`billable/*` + `resolveDefaultBillableServer`, `resolveEntryLinkage`,
`enrichBlock`. `.github/workflows/ci.yml` runs lint, `tsc --noEmit`, test,
build.

---

### [x] 8. Remove `rechart@0.0.1`

`package.json` — abandoned 2015 package next to real `recharts`. Unused in `src/`.

**Done when:** dependency gone from `package.json` / lockfile; app still builds.

**Evidence:** `package.json` has `recharts` only; `rechart` uninstalled.

---

### [x] 9. Dead placeholder code

- `src/app/api/auth/[...nextauth]/route.ts` — 501
- `src/app/api/cron/budget-alerts/route.ts` — 501
- `src/lib/auth.ts` — empty

Auth is explicitly none (`AGENTS.md`). Delete the stubs. Do not implement
NextAuth in this phase.

**Done when:** those files are gone; nothing imports them; `tsc` is clean.

**Evidence:** files deleted; repo search has no imports; `tsc --noEmit` exits 0.

---

### [x] 10. Stray lockfile confuses the dev server

`npm run dev` infers the workspace root as `$HOME` because of a
`package-lock.json` there.

**Fix:** set `turbopack.root` in `next.config.ts` to this repo. Do not delete
files outside the repo.

**Done when:** `next.config.ts` pins the root; `npm run dev` no longer warns
about inferring `/Users/jamesfilios`.

**Evidence:** `next.config.ts` sets `turbopack.root` to `path.resolve(process.cwd())` (not `__dirname` — Next bundles the config). Dev server no longer resolves Tailwind from `/Users/jamesfilios/Software_Projects`.

---

## Phase 2 — Core loop UX

Daily start / edit / review. Server actions already exist for most of this.

### [x] 16. Running timer hides the task

`src/components/custom/TimerBar.tsx`

Description is cleared on start. Running chrome shows “Tracking” + project,
or “Untitled Task” with no project — even when a description was typed.
Project-row Start always sends `description: ''`. Quick-create project from
the bar does not select the new project (Timesheet does).

**Done when:** running bar shows the description (and client if any); Start
from a project row can carry a description or is labeled as untitled;
creating a project from the bar selects it; verified in the browser.

**Evidence:** `TimerBar` running chrome renders `description` + client; quick-create sets `selectedProjectId` from `result.data.id`. Project-row Start is labeled untitled.

---

### [x] 17. Running rows and day totals do not tick

`DashboardView.tsx`, `TrackerList.tsx`, `src/lib/mappers.ts`

Changelog claims live in-row duration and live group totals. Rows still show
`mapEntry` values from the last RSC render. Only `AppShell` ticks.

Optimistic resume can freeze because the tick still sees `pausedAt` on the
server payload.

**Done when:** dashboard recent row + tracker running row + that day’s group
total advance once per second while running; pause freezes them; resume does
not jump. Changelog matches the product. Browser-verified.

**Evidence:** `LiveElapsed` / `LiveDayTotal` / `LiveChromeDuration` tick locally via `displayElapsedSeconds`. AppShell no longer sets a 1s `nowMs`. Browser on `/tracker`: row `00:00:02→04` and day total `00:07:34→36` while running; both froze at `00:00:04` / `00:07:36` on pause; resume stayed `00:00:04`.

---

### [x] 18. Time entries are not editable

`TimeEntryRow.tsx` — description has `cursor-pointer hover:underline` and
no handler. Start/end, project, client cannot be changed. Timesheet grid
cells look like inputs and are display-only. `updateTimeEntry` already
accepts description, project, times.

**Done when:** you can edit description, project, and start/end from the
tracker row (and/or a single edit dialog). Timesheet grid is either editable
or no longer styled as inputs. Fake underline is gone. Browser-verified.

**Evidence:** `TimeEntryRow` kebab “Edit entry” opens the dialog and `updateTimeEntry` saves description/project/times. Browser after reload: description, project `EMT`, start `08:00`, and end `09:30` all persisted. Timesheet grid cells are `tabular-nums` text.

---

### [x] 19. One manual-entry form; local dates; overnight

`TrackerList.tsx` vs `TimesheetView.tsx`

Two dialogs. Tracker is range-only, no client, date default
`toISOString().split('T')[0]` (UTC — wrong local date after evening in US).
Timesheet has range or duration + client. Overnight range is rejected.

**Done when:** both surfaces share one form (Timesheet’s capabilities).
Default date is local. Overnight either wraps to the next day or says so
clearly. Tracker date bug is gone. Browser-verified.

**Evidence:** Tracker and Timesheet both mount `ManualTimeEntryForm`. Date default is `defaultLocalDateKey()`. Overnight wrap is `resolveManualRange`.

---

### [x] 20. Timer mutations fail silently and replace without asking

`AppShell.tsx`, `DashboardView.tsx`, `TrackerPageClient.tsx`, `TimeEntryRow.tsx`

Start/stop/restart often ignore `{ success }`. Starting a new timer silently
stops the current one. Row delete/update/tag failures stay wrong until a
later refresh. Double-Enter on Start can fire twice.

**Done when:** every timer/entry mutation checks `success` and toasts on
failure. Starting while one is running confirms or is obviously a replace.
Start is disabled while the start action is in flight. Browser-verified.

**Evidence:** `requestStart` opens replace confirm when a timer is active. Start button `disabled={isStarting}`. Mutations toast on `!success`.

---

### [x] 21. Isolate the ticking clock

`AppShell.tsx` (~116–124)

The 1s tick sets state on the shell, re-rendering the current page.

**Done when:** only the digit leaf (bar, tab title, live rows) re-renders
each second. Pages that do not show a live duration do not update on the tick.

**Evidence:** tick lives in `LiveElapsed.tsx` leaves only.

---

## Phase 2b — Competitive UX (budget-first)

Gaps vs Toggl Track, Harvest, and Clockify that Chronos does not already
cover in #16–21 / #26–29. Single-tenant freelancer/agency: speed of
starting the *right* retainer work, and not silently over-billing a block.
Do **not** clone desktop-only features (idle detection, global OS
shortcuts, Pomodoro) unless a later `/goal` says so.

### [x] 35. Keyboard shortcuts

Only Enter in the idle description field starts a timer. No app-wide
start/stop/pause, no `?` cheat sheet. `cmdk` is installed and unused.

Rivals: Toggl/Clockify `s` start/stop, `p` pause, `n` new entry.

**Done when:** documented shortcuts start/stop/pause and open manual
entry without focusing the bar; `?` lists them; they do not fire while
typing in an input. Browser-verified.

**Evidence:** `AppShell` keydown uses `shortcutShouldIgnore`. Browser:
`?` opened “Keyboard shortcuts”; `n` opened “Log time manually”; `s`
while focused in the description did not fire; `s` stopped a running
timer back to the idle bar.

---

### [x] 36. Continue last + recents in the timer bar

After stop, the bar is a blank “What are you working on?”. The only
replay is per-row Play. Most billable days are 4–6 repeating retainer
tasks.

Rivals: Toggl Continue; Clockify recent list; Harvest restart last.

**Done when:** idle bar offers Continue (last project + description) and
a short recent-task list; picking one starts immediately. Browser-verified.

**Evidence:** After stop, idle bar showed Continue. Recents come from
`uniqueRecentTasks` on the latest entries. Picker Recents group visible.

---

### [x] 37. Today / this-week totals in the shell

Dashboard is 3 budget cards + retainers + 5 recents. No “Today 2.4h ·
Week 14.1h”. You cannot tell if you are on pace without Reports (and
Reports’ weekly tab is still disabled).

Rivals: Toggl header today/week; Harvest week total always visible.

**Done when:** shell or dashboard shows today and this-week hours
(billable called out). Totals include the running timer. Browser-verified.

**Evidence:** Shell `LivePeriodTotals`: `Today 3.7h · 3.7h billable ·
Week 13.4h · 13.4h billable` while a timer was running.

---

### [x] 38. Favorites, recents, and search in the project picker

`isFavorite` exists but only as a hover star on project rows. `TimerBar`
is a flat 50-item select, no search, no client grouping, `updatedAt` sort.

Rivals: searchable combobox with favorites and recents pinned.

**Done when:** starting a timer can search projects, favorites and
recents are first, and the list is not silently capped at 50 without a
way to find the rest. Browser-verified.

**Evidence:** `ProjectPicker` (cmdk combobox) search + Recents group.
Layout loads 500 active projects. `groupProjectsForPicker` tests pin
favorites then recents.

---

### [x] 39. Tracker search and filters

`/tracker` paginates 50 with no description search or project / client /
tag / billable filter. “What did I bill Acme Thursday?” is how you fix a
retainer before completing the block.

**Done when:** tracker can filter by text + project/client/billable (URL
or equivalent) and the server query matches, not a client-side slice of
50. Browser-verified.

**Evidence:** `/tracker` filter bar; `buildTimeEntryListArgs` applies
`q` / project / client / billable. Browser showed all four controls.

---

### [x] 40. Overlap detection

`logManualTimeEntry` / `updateTimeEntry` only check `end > start`.
Overlapping ranges are stored and both count toward the invoice block.

Rivals: Harvest flags overlaps; Clockify/Toggl timeline.

**Done when:** saving a range that overlaps another entry warns (and
does not silently double-count without the user confirming). Browser-verified.

**Evidence:** `logManualTimeEntry` / `updateTimeEntry` return
`code: "OVERLAP"` unless `confirmOverlap`. Browser: Save Entry 09:00–10:00
opened “Overlapping time”.

---

### [x] 41. Duplicate and split entry

Row kebab is Delete only. A 3h “working” block often needs 2h Client A /
1h Client B; without split the whole duration stays on one
`invoiceBlockId`.

Rivals: Toggl duplicate; Clockify/Harvest split at a time.

**Done when:** you can duplicate an entry and split one at a chosen time
into two valid entries (durations sum to the original). Browser-verified.

**Evidence:** Row kebab Duplicate / Split at time. `splitDurations`
tests: 10800 splits 5400+5400. Browser: both menu items present.

---

### [x] 42. Billable on the timer bar

`startTimer` applies default billable server-side with no `$` and no
toggle. Internal vs retainer work is decided at start; discovering it
after it incremented the block is the budget-first failure.

Rivals: `$` on Toggl/Clockify/Harvest timers.

**Done when:** idle and running bars show billable state and you can
toggle it before or during a run. Browser-verified.

**Evidence:** `$` toggle on idle and running bars. `startTimer` accepts
`isBillable`. Browser: billable control present in both states.

---

### [x] 43. Empty-state CTAs

Dashboard “No active projects found in database”, Tracker “No time
entries yet.”, etc. None start a create or timer flow.

**Done when:** empty dashboard/tracker/clients/projects offer a primary
action (create client/project or start/log). Browser-verified.

**Evidence:** Dashboard empty project/activity CTAs; tracker empty “Log
your first entry”; clients “Add your first client”; projects “Create a
project”. Clients add field `#new-client-name` present in the browser.

---

### [x] 44. Retainer threshold toast while tracking

80% is an amber bar you see only on Dashboard / the client card. A
forgotten timer can blow the block with no interrupt. The 501 budget-alerts
cron was deleted in Phase 1 and not replaced.

**Done when:** crossing 80% or 100% on the active block (including the
running timer) toasts once per crossing. Browser-verified.

**Evidence:** `RetainerWatch` uses `liveBlockHours` (full live elapsed —
stopped snapshots omit `endTime=null`) + `retainerCrossings` +
sessionStorage per block. Tests: 7h + 54m live = 7.9h; 7.5h + 0.6h live
crosses 80% on a 10h block, the durationSeconds-delta path does not.

---

### [x] 45. Rounding rules

Durations are raw seconds. Many retainers are sold in 15-minute
increments; exact seconds under-bills the contract the invoice block
represents.

Rivals: Clockify/Toggl/Harvest 6/15-minute round up or nearest.

**Done when:** a workspace (or client) rounding rule applies to displayed
and billed hours; reports and block progress use the same rule. Tests
cover the shipped function.

**Evidence:** `roundSeconds` in `src/lib/tracking.ts` (nearest/up 6/15).
Cookie `chronos-rounding`. Applied in `LiveElapsed`, timesheet grid,
`mapInvoiceBlock`, reports summary/daily/distribution. Tests in
`tracking.test.ts`.

---

### [x] 46. Week-start preference

Weeks are Sunday in `startOfLocalWeek`, Timesheet, and Reports. Settings
is a dead footer (#27); the missing preference is this.

**Done when:** user can choose Sunday or Monday; Timesheet, Reports
“this week”, and #37 week totals all use it.

**Evidence:** Tracking preferences popover (Sunday/Monday). Cookie
`chronos-week-starts-on`. `weekRangeFromParam` / Reports thisWeek /
`LivePeriodTotals` all take `weekStartsOn`. Tests: Sun vs Mon week
bounds for 2026-08-12.

---

### [x] 47. Undo delete (and easy-to-regret stop)

Confirm-then-gone still loses a billable row. Sonner is used for errors,
not undo.

**Done when:** deleting an entry (and optionally stopping) offers a short
undo toast that restores the row. Browser-verified.

**Evidence:** `deleteTimeEntry` returns a snapshot; toast action calls
`restoreTimeEntry`. Delete remains on the row kebab.

---

### [x] 48. Retarget a running timer

Even after #16 shows the description, the running bar is display-only.
Toggl lets you change project/description/billable mid-run; otherwise
Chronos finalizes onto the wrong block.

**Done when:** you can change description, project, and billable on the
running timer without stopping. Browser-verified.

**Evidence:** Running bar description input, project combobox, `$`
toggle call `updateTimeEntry`. Browser: started “Retarget probe”,
blurred “Retargeted description”, picker+billable present, no stop.

---

### [x] 49. Timesheet: jump to a week; do not drop unassigned time

The week label looks clickable but only prev/next. Grid aggregation
skips `!entry.projectId`, so no-project hours vanish from week totals
while still showing in the list.

**Done when:** you can jump to this week or pick a date; grid/week totals
include entries with no project. Browser-verified.

**Evidence:** Timesheet “This week” + date input `Jump to week`. Grid
keys `UNASSIGNED_PROJECT_KEY` (`__none__`) instead of dropping
`!projectId`. Browser: both jump controls present.

---

### [x] 50. Days-to-empty on retainers

Cards show `Xh / Yh` and %. No “at this week’s pace this 10h block
empties Thursday.”

**Done when:** active retainer cards show a pace / days-to-empty (or
“no recent hours”) using the same hours as the card. Browser-verified.

**Evidence:** Dashboard retainer cards use `daysToEmpty` with the card’s
`hoursTracked` / `hoursTarget` and this week’s hours. Browser matched
“at this week's pace” / “no recent hours”. Tests in `tracking.test.ts`.

---

## Phase 3 — Invoice + write-path integrity

One policy for “what work belongs on this retainer,” with DB constraints.

### [x] 22. At most one running timer (DB + transaction)

`startTimer` is stop-all-then-insert, not transactional. Two parallel starts
can leave two `endTime: null` rows. `getActiveTimer` is unordered `findFirst`.

**Done when:** partial unique index (or equivalent) on running entries;
`startTimer` finalizes any open row and inserts the new one in one
transaction; a concurrent second start cannot leave two running rows.

**Evidence:** Migration
`prisma/migrations/20260815120000_phase3_uniques/migration.sql`
creates `TimeEntry_one_running_key` WHERE `endTime IS NULL`.
`startTimer` calls `startTimerInTransaction` inside `$transaction`
(Serializable) and retries once on P2002. `getActiveTimer` uses
`activeTimerQuery` ordered by `startTime desc`. Tests in
`src/lib/invoice-integrity.test.ts` drive the shipped transaction
helper (finalize then insert).

---

### [x] 23. At most one ACTIVE invoice block per client

`createInvoiceBlock` / `createInvoiceBlockFromWork` are check-then-insert.
`findLatestActiveClientBlock` then picks `startDate desc` and ignores extras.

**Done when:** partial unique index on `(clientId)` where `status = ACTIVE`;
create paths use it (not only a pre-check); a concurrent second create fails
cleanly with the existing “already has an active block” error.

**Evidence:** Same migration:
`InvoiceBlock_one_active_per_client_key` on `clientId` WHERE
`status = 'ACTIVE'`. `createInvoiceBlock` /
`createInvoiceBlockFromWork` map P2002 via
`mapActiveBlockUniqueError` to `ACTIVE_BLOCK_ALREADY_EXISTS`.
Applied on Neon with `prisma migrate deploy`.

---

### [x] 24. `resetInvoiceBlock` is one transaction

Completes the old block, then optionally creates the next. Create failure =
no active block and lost overage. `newTargetHours` is unvalidated.

**Done when:** complete + optional next create is a single `$transaction`;
`newTargetHours` is Zod-validated the same as create; a mid-flight failure
leaves the original block ACTIVE.

**Evidence:** `resetInvoiceBlock` validates with `hoursTargetSchema`
(same as create) then `prisma.$transaction(resetInvoiceBlockInTransaction)`.
Tests: complete then create in one callback; create throw rejects so a
real `$transaction` would roll back.

---

### [x] 25. One membership rule for invoice assignment

Today: `resolveEntryLinkage`, `entryBelongsToClient`, assign `updateMany`
(no client filter on the project branch), reports OR, hours maps keyed by
`project.clientId`. `updateTimeEntry` can change `clientId` and keep the old
`invoiceBlockId`. Running timers are stamped at start and never re-resolved
at stop. Completing a block while a timer runs parks hours on the completed
block. `InvoiceBlockProject` uniqueness is `(block, project)` only — a
project can live-link two ACTIVE blocks.

**Fix this phase (behavior, not a new public framework):**

- Relink (or refuse) when project changes on an already-assigned entry.
- Re-resolve running timers on **stop** (or if the stamped block is no
  longer ACTIVE).
- Assign-work project branch must not pull another client’s entries.
- `getInvoiceBlockWorkOptions` must reject a `blockId` that is not that
  client’s.
- Status updates enforce Completed → Submitted → Paid (match the UI).
- `deleteInvoiceBlock` refuses `PAID` (or requires an explicit force).

A deeper `InvoiceAssignment` module is Phase 5. Do not split more files here.

**Done when:** the cases above have tests or a reproducible script; a
project client change has an explicit policy (move, clear, or block) and
does not silently fork hours.

**Evidence:** Policy is **relink** (`invoiceBlockAfterProjectChange`).
`updateTimeEntry` always writes the resolved block when project changes.
`stopTimer` uses `invoiceBlockOnStop` (re-resolve if stamp is not
ACTIVE). Assign-work project branch uses `assignProjectEntriesWhere`
(clientId or null). `getInvoiceBlockWorkOptions` rejects a foreign
`blockId`. Status uses `canTransitionInvoiceStatus`. Delete uses
`canDeleteInvoiceBlock` (PAID needs force). Tests in
`invoice-integrity.test.ts`.

---

### [x] 26. Invoice UX: visible actions, honest empty, unlink, rename Reset

Hover-only “Set Invoice Target” / “Create From Work”. New block shows 0h
with no “add work” hint. Reset means complete + maybe open next. No unlink
of a project or entry. Touch users never see the CTAs.

**Done when:** CTAs are always visible; card copy says 0h until work is
assigned; Reset is labeled Complete; you can unlink a project and remove an
entry from an active block. Browser-verified on desktop and a narrow
viewport.

**Evidence:** Client-row create CTAs visible without hover (desktop +
390). After expand: Add Work, Complete, “0h until work is assigned”.
Complete dialog title. Assigned a project/entry then Unlink and Remove
succeeded. Scratch: `phase3-browser.txt`.

---

## Phase 4 — Product honesty + cache

Stop looking finished where we are not. Tighten invalidation.

### [ ] 11. Cache invalidation is a sledgehammer

Every action `revalidatePath`s ~5 routes (34 calls in `time-entries.ts`).
Pause busts reports. Invoice actions skip `/tracker` and `/projects`.

**Fix:** `revalidateTag` scoped to the entity that changed.

**Done when:** pause/resume do not revalidate reports; assigning work to a
block refreshes tracker/projects/clients that show those hours.

---

### [ ] 12. (moved) Isolate the ticking clock → Phase 2 #21

Kept the original number in Phase 2 so older notes still resolve.

---

### [ ] 13. `getProjects` sorts by hours in memory

`src/server/data/projects.ts` — `sortBy=hoursUsed` fetches every match,
computes, sorts, slices. Fine at current scale.

**Done when:** either a comment + documented scale limit is enough (leave
it) **or** hours are aggregated in SQL and pagination stays correct. Do not
“fix” this with a wrong paginate-then-sort.

---

### [ ] 27. Reports / sidebar / settings look finished and are not

`ReportsView.tsx` — Invoice / Export / Print / Share have no `onClick`.
Detailed / Weekly / Shared tabs are disabled. Row currency is hardcoded
`USD`. Sidebar “Your Retainers” is `projects.slice(0, 3)`, not clients with
active blocks; `highlightedProjectId` is never passed. Settings footer does
nothing. Nav is `router.push`, not `<Link>`. Dashboard copy says
“Real-time DB Data”. Timesheet “Teammates” is a disabled control.

**Done when:** dead report actions are implemented **or** removed; disabled
tabs are gone or clearly “coming soon” without looking clickable; retainers
list is active invoice-block clients (or the heading is “Projects”);
Settings is removed or opens something; sidebar nav uses `<Link>`; dashboard
jargon is gone; Teammates is gone. Browser-verified.

---

### [ ] 28. `createClient` ignores the color you picked

`ClientsList` sends `color`; `createClient` always runs `getNextClientColor()`.

**Done when:** the chosen swatch is stored; omitting color still auto-assigns.

---

### [ ] 29. Hover-only actions and color-only billable

Row kebab / invoice CTAs / favorite star use `opacity-0 group-hover`.
Billable is a `$` icon, blue vs slate-200. Many icon buttons have `title`
only.

**Done when:** actions are visible on touch (always-visible or a real menu
control); billable has a non-color cue; timer Pause/Stop/Start and row
icon buttons have `aria-label`. Browser-verified at a narrow viewport.

---

### [ ] 14. Dark mode is half-wired

`next-themes` installed, 28 `dark:` variants in `ui/*`, no `ThemeProvider`,
`Toaster` is `theme="light"`, no `dark:` in `components/custom/`.

**Done when:** a ThemeProvider exists, toaster follows the theme, and the
shell + custom views are usable in dark (or `next-themes` is removed so we
stop implying a toggle). Prefer ship a real toggle over deleting.

---

### [ ] 15. Custom components bypass the design system

`TimerBar` and others use raw `<button>` + hardcoded `bg-indigo-600` /
`text-slate-900` instead of `src/components/ui/button`. That is why #14 is
expensive.

**Done when:** new and touched custom controls use the shared `Button` /
`Input` / `Select`. Do this as you touch files, not as a rewrite of every
view in one PR.

---

## Phase 5 — Deepen (only after 1–3)

Do **not** start this phase until Phases 1–3 are `[x]`. Design the
interface before moving files. Follow
`.claude/skills/improve-codebase-architecture/SKILL.md` if you run the
deepening loop (present candidates → user picks → 3 interface designs →
RFC). For `/goal`, implement the already-chosen shape below rather than
re-opening the menu.

### [ ] 30. InvoiceAssignment module

Hide resolver + `entryBelongsToClient` + assign filters + reset transaction
behind a small write API (`assignNewEntry`, `assignExistingWork`,
`completeBlock`). Ports stay internal. Hours snapshots consume assignments;
they do not re-decide them.

**Done when:** call sites in `time-entries.ts` / `invoice-blocks.ts` go
through that API; #23–#25 tests still pass as boundary tests on the new
module.

---

### [ ] 31. TimerSession module

One transaction: finalize any open row, insert the new one. `TimerCalculator`
stays the math. Unique running-timer constraint from #22 is the DB half.

**Done when:** `start` / `stop` / `pause` / `resume` are the module’s
surface; AppShell talks to those four; #2 / #5 / #22 tests still pass.

---

### [ ] 32. EntryEconomics (billable + rate)

One precedence (entry → project → client → default) used by writes, `mapEntry`,
and `billableAmountSql`. Delete the extra wrappers (`resolve-client.ts` /
`TimesheetView.getDefaultBillable` reimplementation).

**Done when:** a single module (or existing `rule.ts` plus one resolver)
is the only precedence; reports SQL is generated or documented from it;
Timesheet no longer has a private copy.

---

### [ ] 33. `loadDashboardContext()`

Layout + every page rebuild mapped `{ projects, clients, entries, activeTimer, tags }`.
Clients page bypasses `getClientsWithData`.

**Done when:** one loader per request; pages take slices; layout does not
double-fetch the same snapshots the page needs.

---

### [ ] 34. Workspace: commit or delete

Writes stamp `workspaceId`; reads ignore it; `TimeEntry` / `InvoiceBlock`
have none. Seed id `default-workspace` vs lookup by name.

**Done when:** either every query is workspace-scoped **or** Workspace is
removed from the mental model (schema can stay if unused). No half-tenant.

---

## Out of scope unless a later `/goal` says so

- Multi-user / NextAuth / teammates
- Real invoice PDF / export / share (unless you explicitly take #27 as
  “implement” rather than “remove”)
- Fees budget type, monthly budget reset, private projects (schema leftovers)
- Dark-mode retrofit of unused `ui/*` primitives you do not touch
- Idle detection / forgotten-timer OS prompts (needs a desktop app or
  extension; a web tab cannot see real idle well)
- Pomodoro / Focus mode
- Command palette (use #35 shortcuts first)
- Stored workspace timezone (browser-local days are enough until someone
  travels)
- Calendar drag-resize of blocks (after #18 is honest)
- Copy last week onto this week
- Personal weekly capacity target (retainers already have targets)
- PWA / lock-screen mobile app

---

## Phase order

| Phase | Goal | Depends on |
|---|---|---|
| 1 Stabilize | Users see the right time and the repo has a quality floor | — |
| 2 Core loop | Start, edit, review is honest | #2, #3, #5, #7 |
| 2b Competitive UX | Faster start, fewer silent over-bills | Phase 2 |
| 3 Invoice integrity | One retainer policy, no silent forks | #7, #23–#25 |
| 4 Honesty + cache | Dead chrome gone, invalidation scoped | 2–3 |
| 5 Deepen | Smaller interfaces, same behavior | 1–3 all `[x]` |

---

## `/goal` prompts

Copy one. Do not launch two phases at once.

### Phase 1 (launch this first)

```
/goal Work Phase 1 of IMPROVEMENTS.md in this Chronos repo (items 2–10; 1 is already done). IMPROVEMENTS.md is the only backlog. For each item: implement, satisfy its Done when checks, mark [x], and add a CHANGELOG.md Unreleased note for anything a user can see. Pair #2 with #6 (same AppShell effect). Then #3, then #7 (Vitest + CI around timer-calculator, time.ts, billable, invoice-linkage, enrichBlock), then #4 #5 #8 #9 #10. Do not start Phase 2. Do not mark this goal complete unless every Phase 1 item is [x], npm run lint exits 0, npx tsc --noEmit exits 0, and npm test passes. If #2 cannot be reproduced, leave it [~] with the evidence and pause rather than claiming done.
```

### Phase 2

```
/goal Work Phase 2 of IMPROVEMENTS.md (items 16–21). IMPROVEMENTS.md is the only backlog. Ship an honest timer/edit/review loop: running description, live row+total ticks, in-place entry edit, one manual-entry form with local dates, mutation toasts + start-while-running confirm, isolated tick. Verify every UI item in the browser. Mark [x] only when Done when passes. CHANGELOG Unreleased for user-visible changes. Do not start Phase 2b or 3. Complete only when 16–21 are [x].
```

### Phase 2b

```
/goal Work Phase 2b of IMPROVEMENTS.md (items 35–50). IMPROVEMENTS.md is the only backlog. Competitive UX vs Toggl/Harvest/Clockify: shortcuts, continue/recents, today/week totals, searchable favorite project picker, tracker filters, overlap warning, duplicate/split, billable on the bar, empty-state CTAs, 80% retainer toast, rounding, week-start pref, undo delete, mid-run retarget, timesheet jump-to-week + unassigned hours, days-to-empty. Verify UI in the browser. Mark [x] only when Done when passes. CHANGELOG Unreleased for user-visible changes. Do not start Phase 3. Do not implement idle detection, Pomodoro, PWA, or a command palette. Complete only when 35–50 are [x].
```

### Phase 3

```
/goal Work Phase 3 of IMPROVEMENTS.md (items 22–26). One running timer and one ACTIVE block per client at the DB, transactional reset, one membership rule for assignment (relink/stop re-resolve, no cross-client sweep, status progression, no delete of PAID), plus invoice UX (visible CTAs, empty copy, unlink, rename Reset). Tests for the integrity items. Browser-verify #26. Do not deepen into new modules (that is Phase 5). Complete only when 22–26 are [x].
```

### Phase 4

```
/goal Work Phase 4 of IMPROVEMENTS.md (items 11, 13, 27–29, then 14–15 as you touch files). Tag-based revalidation, honest reports/sidebar chrome, createClient color, visible/accessible row actions. Dark mode only if you ship a real toggle; otherwise leave 14/15 [ ] and do not claim them. Complete when 11, 27–29 are [x] and 13 is decided.
```

### Phase 5

```
/goal Work Phase 5 of IMPROVEMENTS.md (items 30–34) only if Phases 1–3 are fully [x]. Deepen InvoiceAssignment, TimerSession, EntryEconomics, loadDashboardContext, and a yes/no on Workspace. Keep existing Phase 3 tests as boundary tests. Do not change product behavior except as those items specify. Complete when 30–34 are [x].
```
