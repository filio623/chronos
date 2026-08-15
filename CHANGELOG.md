# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning.

## [Unreleased]

### Changed
- Invoice create actions stay visible on client rows (no hover-only CTAs). Empty blocks say 0h until work is assigned. Reset is labeled Complete. You can unlink a project and remove an entry from an active block.

### Added
- Keyboard shortcuts: `s` start/stop, `p` pause/resume, `n` new manual entry, `?` cheat sheet. Shortcuts do not fire while typing in an input.
- Idle timer bar Continue + recent-task chips start the last project and description immediately.
- Searchable project picker with favorites and recents pinned (no silent 50-item cap on the bar).
- Billable toggle on the idle and running bars; you can change description, project, and billable on a running timer without stopping.
- Tracker filters for description, project (including unassigned), client, and billable — applied on the server and reflected in the URL.
- Overlap warning when saving a range that collides with another entry; save requires confirm.
- Duplicate and split-at-time on the entry menu; delete offers an undo toast.
- Today / this-week totals in the shell (including the running timer, with billable called out).
- Sunday/Monday week-start and duration rounding preferences (exact, nearest/up 6 or 15 minutes). Timesheet, Reports “this week”, week totals, displayed hours, reports, and retainer progress share those prefs.
- Timesheet jump to this week or a picked date; week/grid totals include no-project hours.
- Days-to-empty (or “no recent hours”) on active retainer cards.
- One toast per 80% and 100% retainer crossing, including the full elapsed of a running timer (stopped block hours omit open timers).
- Empty dashboard / tracker / clients / projects offer a primary create or start/log action.

### Fixed
- Pausing a timer now keeps a pause symbol plus the elapsed time in the browser tab (`⏸ mm:ss - Chronos`) until you resume or stop, instead of falling back to a bare `Chronos` title.
- Timesheet week navigation queries that week on the server, so older weeks no longer look empty once you have more than 50 entries. Tracker paginates with a visible “showing N of M” count.
- The running timer bar now keeps the task description (and client when one exists) instead of replacing it with “Tracking”.
- Starting a new timer while one is already running asks before replacing it.
- Manual time on the tracker uses the same form as the timesheet, defaults to today’s local date, and wraps overnight ranges to the next day.

### Added
- Invoice block work assignment tools: you can now add specific past entries and selected projects to an active invoice block, with project links continuing to auto-capture future entries for those projects.
- New “Create Block from Work” flow for clients without an active block, including multi-select entry/project grouping and auto-filled target hours based on selected work.
- Invoice block lifecycle status controls in history, allowing completed blocks to be manually marked as submitted or paid.
- Project rows now include direct timer controls so you can start a tracking session from the projects list without switching views.

### Changed
- Tracker and dashboard durations for the running entry (and that day’s group total) tick live from the same elapsed helper as the timer bar, without re-rendering the whole page every second.
- Time entries can be edited (description, project, start/end) from the tracker row.
- Timesheet week-grid cells are plain totals, not fake inputs.
- Dashboard Recent Activity now live-updates the duration shown for the currently running timer entry, so elapsed time advances in-row alongside `Running...`.
- Tracker view now uses the same live timer duration for the currently running entry, including live-updated group totals.
- Browser tab title now keeps showing elapsed time while a timer is paused (`Paused • mm:ss`) instead of clearing.
- Resuming a paused timer no longer briefly jumps forward by paused minutes before settling; elapsed time now stays stable through resume.
- Invoice block tracking now uses explicit entry assignments instead of date ranges, and newly created blocks start empty until work is assigned.
- Invoice block work dialogs now include faster multi-select controls (`Select all` / `Clear`) and clearer guidance around project live-link behavior and target-hour defaults.
- Invoice block status actions now follow a clearer progression in history (`Completed` -> `Submitted` -> `Paid`) instead of allowing direct completion-to-paid jumps.

### Fixed
- Invoice block carry-forward now counts as already-used time in the next block instead of increasing the next block target. New blocks keep their configured target and start with carried overage applied to tracked progress.
- Prisma migration flow for invoice block statuses now avoids PostgreSQL enum transaction ordering issues by applying legacy `COMPLETED` → `SUBMITTED` data conversion in a follow-up migration.
- New timer entries and manual entries now fall back to a client's active invoice block when no project-specific block link exists, so active retainers keep capturing current work for that client.

## [0.1.2] - 2026-02-02

### Added
- Expanded the client/project color picker with eight new contrasting swatches and supporting metadata.

### Changed
- Dashboard project and client cards (including the active retainers columns and sidebar quick-access list) now navigate directly to the matching project or client while highlighting the row in its list view.
- Sidebar retainer dots now reuse the project palette color so the left-hand swatches match the project list.
- Budget overview cards now show the matching project color dot so the dashboard uses the same palette as the selectors.

### Fixed
- Resolved a TypeScript build error by avoiding `JSX.IntrinsicElements` in the budget card container typing.

## [0.1.1] - 2026-01-31

### Added

- Client and project default billable settings with hierarchy overrides.
- Time entry tag assignment from the tracker list and recent activity.
- Hierarchical billable rates with optional entry overrides.

### Changed

- Billable defaults now apply when starting timers or logging manual entries.
- Report totals now calculate billable amounts using effective rates.

## [0.1.0] - 2026-01-30

### Added

- Live time tracking with start, pause, resume, and stop.
- Manual time entry by time range or duration.
- Project and client management with hourly budgets.
- Budget overview and recent activity dashboard.
- Client invoice blocks with carry-over and history.
- Reporting views with date presets and filters (summary, detailed, weekly).
- Prisma-backed Postgres storage (Neon) with seed support.
