# Chronos

Chronos is a budget-first time tracking app for agencies and freelancers working on retainer-style projects. Track time against projects and client budgets, review performance, and log manual entries when needed.

## What it does

- **Live timer**: start/stop/pause/resume a timer tied to a project (and optional client).
- **Manual time**: log time entries by range or duration.
- **Budgets**: project budgets (hours) with progress visualization.
- **Clients**: manage client details and see total tracked hours.
- **Invoice blocks**: set client retainer blocks, carry over time, and review history.
- **Reports**: summary, detailed, and weekly views with date presets and filters.

## How it works

Chronos uses Next.js App Router with Server Actions. Data is stored in Postgres (Neon) via Prisma:

- **Clients** own projects and invoice blocks.
- **Projects** track budgets and time entries.
- **Time entries** are created by the live timer or manual logging.
- **Invoice blocks** model retainer periods and usage.

There is currently **no authentication**; it’s a single-tenant experience intended for personal or internal use.

## Tech stack

- Next.js 16 (App Router)
- React 19
- Prisma + PostgreSQL (Neon)
- Tailwind CSS + Radix UI
- Recharts for reporting visuals

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Environment

Create a `.env` file with:

```bash
DATABASE_URL="postgresql://..."
```

### Database

```bash
npx prisma migrate dev
npx prisma db seed   # optional sample data
```

## Releases

See `CHANGELOG.md` for release notes and ongoing changes.
