# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning.

## [Unreleased]

### Added
- Invoice block work assignment tools: you can now add specific past entries and selected projects to an active invoice block, with project links continuing to auto-capture future entries for those projects.
- New “Create Block from Work” flow for clients without an active block, including multi-select entry/project grouping and auto-filled target hours based on selected work.
- Invoice block lifecycle status controls in history, allowing completed blocks to be manually marked as submitted or paid.
- Project rows now include direct timer controls so you can start a tracking session from the projects list without switching views.

### Changed
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
