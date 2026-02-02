# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows semantic versioning.

## [Unreleased]

- Added
  - Expanded the client/project color picker with eight new contrasting swatches and supporting metadata.

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
