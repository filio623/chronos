# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning.

## [Unreleased]

### Changed
- Dashboard Recent Activity now live-updates the duration shown for the currently running timer entry, so elapsed time advances in-row alongside `Running...`.
- Tracker view now uses the same live timer duration for the currently running entry, including live-updated group totals.
- Browser tab title now keeps showing elapsed time while a timer is paused (`Paused • mm:ss`) instead of clearing.
- Resuming a paused timer no longer briefly jumps forward by paused minutes before settling; elapsed time now stays stable through resume.

### Fixed
- Invoice block carry-forward now counts as already-used time in the next block instead of increasing the next block target. New blocks keep their configured target and start with carried overage applied to tracked progress.

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
