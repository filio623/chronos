# Retainer-Tracker: Technical Architecture & Developer Guide

**Version:** 3.0.0
**Date:** January 20, 2026
**Author:** Gemini Agent (on behalf of James Filios)
**Repository:** `https://github.com/filio623/time_tracker_app`

---

# Table of Contents

1.  [Executive Overview](#1-executive-overview)
    *   1.1 The Vision
    *   1.2 The Core Problem: "The Overage Trap"
    *   1.3 The Solution: Budget-First Tracking
2.  [System Architecture](#2-system-architecture)
    *   2.1 Technology Stack (The T3-Next Hybrid)
    *   2.2 Application Architecture (The Colocation Strategy)
    *   2.3 File Structure Deep Dive
3.  [Database Architecture](#3-database-architecture)
    *   3.1 Entity Relationship Diagram (ERD)
    *   3.2 Schema Design & Key Decisions
    *   3.3 The Prisma ORM Layer
4.  [Backend Logic & Data Access](#4-backend-logic--data-access)
    *   4.1 The "Two-Layer" Backend Pattern
    *   4.2 Server Actions (The Mutation Layer)
    *   4.3 The "Atomic Timer" Algorithm
    *   4.4 Reporting & Aggregation Strategy
5.  [Frontend Architecture](#5-frontend-architecture)
    *   5.1 React Server Components (The Data Orchestrator)
    *   5.2 Client Components & Interactivity
    *   5.3 React 19 Patterns (Transitions & Pending States)
    *   5.4 State Management Strategy
6.  [Feature Implementation Deep Dives](#6-feature-implementation-deep-dives)
    *   6.1 Real-time Budget Calculation
    *   6.2 Advanced URL-Based Filtering
    *   6.3 Manual Time Entry & Validation
7.  [Developer Operations](#7-developer-operations)
    *   7.1 Environment Setup
    *   7.2 Database Management
    *   7.3 Deployment Guide
8.  [Future Roadmap & Next Steps](#8-future-roadmap--next-steps)

---

# 1. Executive Overview

## 1.1 The Vision
**Retainer-Tracker** is a specialized Enterprise SaaS application purpose-built for digital agencies, consultants, and freelancers who operate on a "Retainer" billing model.

Unlike generic time tracking tools (e.g., Toggl, Clockify, Harvest) which focus primarily on "logging hours," Retainer-Tracker flips the paradigm to focus on **"Remaining Budget"**.

The goal is to provide a dashboard that answers one critical financial question at a glance:
> *"How much capacity do I have left for this client before I start working for free?"*

## 1.2 The Core Problem: "The Overage Trap"
Service providers often sell blocks of time (e.g., "10 hours per month for maintenance").
*   **Visibility Gap:** They track time in one tool but manage contracts in another (or a spreadsheet).
*   **The Surprise:** They only realize they've worked 15 hours on a 10-hour contract when they generate the invoice at the end of the month.
*   **The Result:** 5 hours of unbillable work (revenue leakage) or an awkward conversation with the client.

## 1.3 The Solution: Budget-First Tracking
Retainer-Tracker solves this by tightly coupling the **Timer** to the **Budget Limit**.
*   **Visual Feedback:** As you track time, the project card changes color (Emerald → Amber → Rose) to warn of approaching limits.
*   **Unified Workflow:** You don't "log time to a task"; you "log time against a budget."
*   **Self-Hosted Sovereignty:** Built to be deployed on personal infrastructure (Synology NAS, Docker) or standard cloud (Vercel/Neon) to ensure data privacy and zero subscription fees.

---

# 2. System Architecture

## 2.1 Technology Stack (The T3-Next Hybrid)
We utilize a modern, type-safe stack designed for performance, developer experience, and maintainability.

| Layer | Technology | Version | Rationale |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js** | 15.1.0 | Utilizes the App Router and React Server Components (RSC) to fetch database data directly in the UI layer, eliminating the need for a separate REST API. |
| **Language** | **TypeScript** | 5.x | Provides end-to-end type safety. The types generated from our Database Schema (`@prisma/client`) flow directly into our UI components. |
| **Database** | **PostgreSQL** | 16 (Neon) | A robust relational database. We use **Neon** for its serverless capability (scales to zero) and branching features. |
| **ORM** | **Prisma** | 7.2.0 | The interface between TypeScript and SQL. It handles migrations (`prisma migrate`) and query generation (`prisma client`). |
| **Styling** | **Tailwind CSS** | 4.0 | A utility-first CSS framework that allows for rapid UI development and a consistent "Design System" via utility classes. |
| **UI Library** | **Shadcn/UI** | Latest | A collection of accessible, re-usable components (Dialogs, Selects, Buttons) built on Radix UI primitives. |
| **State** | **React Hooks** | 19 | Uses modern hooks like `useTransition` for handling server action states without heavy global state libraries (Redux). |
| **Charts** | **Recharts** | Latest | A composable charting library built on D3, used for the Reporting layer. |

## 2.2 Application Architecture (The Colocation Strategy)
The architecture follows a **Domain-Driven Colocation** strategy. Instead of separating code by technical role (e.g., `controllers/`, `views/`), we group it by Next.js conventions and Feature Domains.

*   **The "Server" is the App:** There is no separate `express` server. Next.js handles both the HTTP serving (Frontend) and the Data Access (Backend) via **Server Actions**.
*   **Zero-API Data Fetching:** We do not fetch data via `fetch('/api/projects')`. Instead, the Server Component calls the database function `getProjects()` directly during the render pass. This reduces latency and complexity.

## 2.3 File Structure Deep Dive

```text
src/
├── app/                        # Next.js Routing Layer
│   ├── api/                    # HTTP Endpoints (only for external webhooks/cron)
│   ├── page.tsx                # The Homepage (Server Component). The data "Orchestrator".
│   ├── layout.tsx              # Root HTML shell (Fonts, Metadata, Global Styles).
│   └── globals.css             # Tailwind Directives & CSS Variables.
│
├── components/
│   ├── ui/                     # "Dumb" UI Primitives (Buttons, Cards, Inputs).
│   │   └── button.tsx          # Copy-pasted from Shadcn.
│   └── custom/                 # "Smart" Domain Components.
│       ├── MainDashboard.tsx   # The Client-Side Shell. Manages the 'View' state.
│       ├── ProjectsList.tsx    # Complex UI with filtering and modals.
│       ├── TimerBar.tsx        # The persistent sticky timer header.
│       └── ReportsView.tsx     # Analytics dashboard with Recharts.
│
├── server/                     # The Backend Logic Layer
│   ├── actions/                # MUTATIONS (Write Operations).
│   │   ├── clients.ts          # Logic to create/update Clients.
│   │   ├── projects.ts         # Logic to create/edit/delete Projects.
│   │   └── time-entries.ts     # Logic to start/stop timers.
│   │
│   └── data/                   # QUERIES (Read Operations).
│       ├── reports.ts          # Complex aggregation logic (Group by Day, etc.)
│       ├── projects.ts         # Fetchers with specific 'include' relations.
│       └── ...
│
├── lib/                        # Singletons & Configuration
│   ├── prisma.ts               # Global Prisma Client (prevents connection exhaustion).
│   └── utils.ts                # Helper for merging Tailwind classes (clsx/twMerge).
│
└── types.ts                    # Shared Interfaces used by both DB mappers and UI.
```

---

# 3. Database Architecture

## 3.1 Entity Relationship Diagram (ERD)
The database schema is normalized to ensure data integrity and query efficiency.

```mermaid
erDiagram
    WORKSPACE {
        uuid id PK
        string name
        string ownerId
        datetime createdAt
    }
    CLIENT {
        uuid id PK
        string name
        string currency
        uuid workspaceId FK
    }
    PROJECT {
        uuid id PK
        string name
        float budgetLimit "The Retainer Cap (e.g. 10.0)"
        boolean isArchived
        boolean isFavorite
        uuid clientId FK
        uuid workspaceId FK
    }
    TIME_ENTRY {
        uuid id PK
        datetime startTime
        datetime endTime "NULL if currently running"
        int duration "Cached duration in Seconds"
        string description
        boolean isBillable
        uuid projectId FK
    }

    WORKSPACE ||--o{ CLIENT : owns
    CLIENT ||--o{ PROJECT : has
    PROJECT ||--o{ TIME_ENTRY : "logs time against"
```

## 3.2 Schema Design & Key Decisions

### The "Integer Duration" Decision
We store `duration` as an `Int` (seconds) rather than relying solely on `end - start` calculation at runtime.
*   **Why?**
    1.  **Aggregation Speed:** `SUM(duration)` is an extremely fast integer operation for the database.
    2.  **Immutability:** If we ever need to "adjust" a duration (e.g., subtract 30 mins for a lunch break) without changing the timestamp, we can edit this field directly.

### The "Active Timer" Definition
An active timer is defined purely by the data state: **A TimeEntry where `endTime` is NULL.**
*   **Constraint:** The application logic enforces that only **one** record can have `endTime: NULL` per user at any given moment. This "Atomic Timer" logic is handled in the Backend Layer.

### Cascading Deletes
We use Prisma's relational capabilities to ensure clean data. If a **Project** is deleted, all associated **TimeEntry** records are automatically deleted (`onDelete: Cascade` behavior simulated or enforced). This prevents "orphaned" time entries that clutter the database and skew reports.

---

# 4. Backend Logic & Data Access

## 4.1 The "Two-Layer" Backend Pattern
We separate our backend logic into **Queries** (Reading) and **Actions** (Writing).

### Layer 1: Data Access (`src/server/data/*`)
These are pure async functions that fetch data. They act as "Prepared Statements".
*   **Example:** `getProjects(filters)`
    *   Accepts an object: `{ search: 'website', status: 'active' }`.
    *   Constructs a dynamic Prisma `where` clause.
    *   Returns strictly typed `Project[]` arrays including relation data (`include: { client: true }`).

### Layer 2: Server Actions (`src/server/actions/*`)
These are the public API of our application. They are callable directly from frontend forms.
*   **Responsibilities:**
    1.  **Input Parsing:** Extract data from `FormData`.
    2.  **Validation:** Ensure required fields exist.
    3.  **DB Mutation:** Execute `prisma.create` or `prisma.update`.
    4.  **Cache Revalidation:** Call `revalidatePath('/')` to tell Next.js to purge its cache and refresh the UI with new data immediately.

## 4.2 The "Atomic Timer" Algorithm
Located in `src/server/actions/time-entries.ts`, the `startTimer` function ensures data consistency:

```typescript
export async function startTimer(projectId: string, description: string) {
  // Step 1: "Close the door behind you"
  // Find any currently running timer and stop it.
  await prisma.timeEntry.updateMany({
    where: { endTime: null },
    data: { endTime: new Date() } 
  });

  // Step 2: "Open the new door"
  // Create the new entry with start time = NOW.
  await prisma.timeEntry.create({
    data: {
      projectId,
      description,
      startTime: new Date()
    }
  });
  
  // Step 3: Refresh UI
  revalidatePath("/");
}
```

## 4.3 Reporting & Aggregation Strategy
Reports are calculated **Server-Side** to keep the client lightweight.
*   **File:** `src/server/data/reports.ts`
*   **Daily Activity:**
    1.  Fetches all entries within a date range (e.g., 30 days).
    2.  Iterates through the range to ensure every day is represented (even if 0 hours).
    3.  Sums the `duration` for entries on that day.
    4.  Returns a clean JSON array for Recharts: `[{ date: '2024-01-01', hours: 6.5 }, ...]`.

---

# 5. Frontend Architecture

## 5.1 React Server Components (The Data Orchestrator)
The file `src/app/page.tsx` is a **Server Component**. It never runs in the browser.
*   **Role:** It acts as the "Controller".
*   **Behavior:**
    1.  It reads the URL Search Params (`?search=foo`).
    2.  It calls multiple backend functions in parallel using `Promise.all`:
        *   `getProjects()`
        *   `getClients()`
        *   `getTimeEntries()`
        *   `getSummaryMetrics()`
    3.  It passes this fully resolved data to the `MainDashboard` client component as props.

## 5.2 Client Components & Interactivity
The file `src/components/custom/MainDashboard.tsx` is a **Client Component** (`"use client"`).
*   **Role:** The "View". It manages user interaction.
*   **State:** It holds the `currentView` state (Dashboard vs. Projects vs. Reports) to switch tabs instantly without a server roundtrip.
*   **Timer Logic:** It runs a local `setInterval` that increments a counter every second. This creates the visual effect of a ticking timer, even though the actual "Start Time" is a static timestamp from the server.

## 5.3 React 19 Patterns (Transitions)
We avoid standard `isLoading` states for mutations. Instead, we use `useTransition`:

```typescript
const [isPending, startTransition] = useTransition();

const handleDelete = () => {
  startTransition(async () => {
    await deleteProject(id); // Server Action
  });
};
```
*   **Benefit:** The UI remains responsive. We can use the `isPending` boolean to show a subtle spinner or dim the row being deleted, providing immediate feedback while the server processes the request.

---

# 6. Feature Implementation Deep Dives

## 6.1 Real-time Budget Calculation
How do we know a project is "80% Used"?
1.  **Fetch:** When fetching Projects, we include `timeEntries`.
2.  **Map:** In `page.tsx`, we map over the raw DB result.
3.  **Reduce:** We sum the `duration` of all entries for that project.
    `totalSeconds = entries.reduce((sum, e) => sum + e.duration, 0)`
4.  **Calculate:** `hoursUsed = totalSeconds / 3600`.
5.  **Display:** The `BudgetCard` component compares `hoursUsed` vs `project.budgetLimit`.
    *   `< 80%`: Green (`bg-emerald-500`)
    *   `> 80%`: Amber (`bg-amber-500`)
    *   `> 100%`: Red (`bg-rose-500`)

## 6.2 Advanced URL-Based Filtering
The **Projects List** does not use local state for filtering. It uses the URL.
*   **Scenario:** User types "Website" in the search box.
*   **Action:**
    1.  Input `onChange` fires.
    2.  Debounce timer waits 300ms.
    3.  `router.replace('?search=Website')` is called.
*   **Reaction:**
    1.  Next.js sees the URL change.
    2.  It re-runs the Server Component (`page.tsx`) with new params.
    3.  `getProjects({ search: 'Website' })` executes a Prisma `contains` query.
    4.  The page updates with filtered data.
*   **Benefit:** You can share the URL with a colleague, and they see the exact same filtered view.

## 6.3 Manual Time Entry
Sometimes users forget to track time. The **Manual Entry** modal solves this.
*   **Inputs:** `Date`, `Start Time` (e.g. "09:00"), `End Time` (e.g. "11:00").
*   **Processing:**
    1.  Frontend combines Date + Time into ISO Strings.
    2.  Server Action receives ISO Strings.
    3.  Server calculates `duration = End - Start` (in seconds).
    4.  Server saves record.
*   **Validation:** Prevents negative duration (End before Start).

---

# 7. Developer Operations

## 7.1 Environment Setup
To run this project locally, you need:
1.  **Node.js:** v22 or higher (LTS).
2.  **Database:** A PostgreSQL connection string (Local Docker or Cloud).

**Steps:**
```bash
# 1. Clone
git clone https://github.com/filio623/time_tracker_app.git
cd time_tracker_app

# 2. Install Dependencies
npm install

# 3. Environment
cp .env.example .env
# Edit .env and add: DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# 4. Initialize Database
npx prisma migrate dev --name init

# 5. Seed Initial Data (Optional)
npx prisma db seed

# 6. Run
npm run dev
```

## 7.2 Database Management (Prisma)
We use Prisma CLI for all DB ops.
*   `npx prisma studio`: Opens a web GUI to view/edit raw data.
*   `npx prisma migrate dev`: Run this after editing `schema.prisma`.
*   `npx prisma generate`: Run this to update TypeScript definitions.

## 7.3 Deployment Guide
This application is "Serverless Ready".
1.  **Hosting:** Deploy to **Vercel** (recommended for Next.js).
2.  **Database:** Provision a **Neon** Postgres database.
3.  **Config:** Set `DATABASE_URL` in Vercel Environment Variables.
4.  **Build:** Vercel automatically detects Next.js and runs `next build`.

---

# 8. Future Roadmap & Next Steps

While Version 3.0.0 is robust, these features are planned for future phases to bring the application to full Enterprise maturity.

1.  **Authentication (Phase 5):**
    *   Integrate **Better-Auth** (or NextAuth).
    *   Update Schema: Link `Workspace` to specific `User` IDs.
    *   Enable multi-user workspaces with "Admin" and "Member" roles.

2.  **Multi-Tenancy (Phase 6):**
    *   Allow users to switch between different `Workspaces` (e.g., "Personal" vs. "Agency").
    *   Enforce Row Level Security (RLS) or application-level checks to ensure users only see data from their active workspace.

3.  **Advanced Invoicing:**
    *   Generate PDF invoices from Time Entries using `react-pdf`.
    *   "Mark as Billed" feature: Select entries -> Click "Bill" -> Reset Budget Progress Bar.

4.  **Tagging System:**
    *   Implement the UI for the existing `Tag` schema model.
    *   Allow filtering Reports by Tag (e.g., "How much time did we spend on 'Meetings' this month?").

5.  **Native Desktop App:**
    *   Wrap the web app in **Tauri** or **Electron** for a native experience with global hotkeys (e.g., `Cmd+Shift+T` to toggle timer).

---
*End of Technical Guide*