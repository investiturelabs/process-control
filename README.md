# AuditFlows

A React web app for managing store audit checklists. Built for retail teams who need to perform weekly audits across departments, score compliance, and track performance over time.

## Overview

AuditFlows turns a traditional spreadsheet-based audit into an interactive flashcard-style experience. Auditors swipe through questions for each department, tap **Yes**, **No**, or **Partial**, and get an instant score breakdown when they're done. Scores are tracked over time so managers can spot trends and address issues early.

The app ships pre-loaded with **171 audit questions** across **9 departments**, inspired by real grocery/retail PCR audit processes.

## Features

### Audit Flow
- **Flashcard-style interface** — one question at a time, swipe through with Yes / No / Partial buttons
- **Auto-advance** on answer selection for fast auditing
- **Dot navigator** to jump between questions or revisit answers
- **Progress bar** showing completion status
- **Risk category badges** on each question card

### Scoring
- Instant score tally on completion with percentage and letter grade
- Per-category breakdown showing points earned vs. possible
- Score thresholds:
  - **Outstanding** — 98%+
  - **Great** — 94–97%
  - **Very Good** — 91–93%
  - **Needs Improvement** — 80–90%
  - **Critical** — below 80%

### History & Trends
- Filter audit history by department
- Line chart showing score trends over time (powered by Recharts)
- Full session list with scores, dates, and auditor names

### Team Management
- **Two roles**: Admin and User
- First person to sign in becomes the Admin
- Admins can invite team members by email
- Admins can change user roles
- Simple name + email login (no passwords)

### Question Management (Admin)
- **Add, edit, and delete questions** from the Settings page
- Organized by department with collapsible sections
- Create new risk categories on the fly
- Configure answer type (Yes/No or Yes/No/Partial) and point values per question
- Reset all departments to default seed data

### Company Settings
- Set company name and logo URL
- Displayed in the app header

## Departments

| Department | Questions | Key Risk Categories |
|---|---|---|
| General Risk | 60 | Store Conditions, Food Safety, Safety, Loss Prevention, Inventory, Front End, HR |
| Meat & Seafood | 41 | Food Safety, Store Conditions, Safety, Inventory, Weights & Measures |
| Deli | 27 | Food Safety, Safety, Store Conditions, Inventory, Weights & Measures |
| Bakery | 16 | Food Safety, Safety, Store Conditions, Inventory, Weights & Measures |
| Produce & Floral | 11 | Store Conditions, Inventory, Food Safety, Safety |
| Bulk | 5 | Food Safety, Store Conditions, Weights & Measures |
| Dairy | 4 | Food Safety, Inventory |
| Grocery | 4 | Inventory, Food Safety |
| Vitamins & HBA | 3 | Inventory, Loss Prevention, Food Safety |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.9 |
| Build tool | Vite 7.3 |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui (Radix primitives) |
| Icons | Lucide React |
| Charts | Recharts |
| Routing | React Router v7 |
| Date formatting | date-fns |
| IDs | uuid |
| Persistence | localStorage |

## Project Structure

```
src/
├── App.tsx                         # Router & protected routes
├── main.tsx                        # Entry point
├── types.ts                        # TypeScript interfaces
├── store.ts                        # useStore hook (localStorage persistence)
├── context.tsx                     # React context provider
├── seed-data.ts                    # 171 default audit questions
├── index.css                       # Tailwind v4 + shadcn/ui theme
├── components/
│   ├── Layout.tsx                  # App shell (header, nav, mobile menu)
│   ├── DeptIcon.tsx                # Department → Lucide icon mapper
│   ├── QuestionFormDialog.tsx      # Add/edit question dialog
│   └── ui/                         # shadcn/ui components
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── progress.tsx
│       ├── select.tsx
│       └── separator.tsx
├── lib/
│   ├── utils.ts                    # cn() utility (clsx + tailwind-merge)
│   └── score-colors.ts             # Score color & grade label helpers
└── pages/
    ├── LoginPage.tsx               # Name + email sign-in
    ├── DashboardPage.tsx           # Stats, department grid, recent audits
    ├── AuditPage.tsx               # Flashcard audit flow
    ├── ResultsPage.tsx             # Score breakdown after audit
    ├── HistoryPage.tsx             # Score trends & session list
    ├── SettingsPage.tsx            # Company info + question CRUD
    └── TeamPage.tsx                # Member list + invitations
```

## Routes

| Path | Page | Description |
|---|---|---|
| `/login` | LoginPage | Sign in with name and email |
| `/` | DashboardPage | Overview stats, department grid, recent audits |
| `/audit/:departmentId` | AuditPage | Flashcard audit for a department |
| `/results/:sessionId` | ResultsPage | Score breakdown for a completed audit |
| `/history` | HistoryPage | Score trends and past sessions |
| `/settings` | SettingsPage | Company settings and question management |
| `/team` | TeamPage | Team members and invitations |

All routes except `/login` require authentication.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- A [Clerk](https://clerk.com) account (free tier works)
- A [Convex](https://www.convex.dev) account (free tier works)

### 1. Clone & Install

```bash
git clone <repo-url>
cd audit-flows
npm install
```

### 2. Set Up Clerk

1. Create a Clerk application at [dashboard.clerk.com](https://dashboard.clerk.com).
2. Copy your **Publishable Key** and **Secret Key** from the Clerk dashboard.

### 3. Set Up Convex

1. Run the Convex dev server for the first time — this will prompt you to log in and create a development deployment:

   ```bash
   npx convex dev
   ```

2. Convex will automatically write `CONVEX_DEPLOYMENT` and `VITE_CONVEX_URL` to your `.env.local` file.

3. **Set the Clerk JWT issuer domain on your Convex deployment.** This is a server-side environment variable required for auth — it cannot be set in `.env.local` because Convex server functions don't read from local env files.

   Find your Clerk issuer URL in the Clerk dashboard (typically `https://<your-subdomain>.clerk.accounts.dev`), then set it via CLI:

   ```bash
   npx convex env set CLERK_JWT_ISSUER_DOMAIN "https://<your-clerk-subdomain>.clerk.accounts.dev"
   ```

   Or set it in the [Convex dashboard](https://dashboard.convex.dev) under **Settings → Environment Variables**.

### 4. Configure Local Environment Variables

Copy the example env file and fill in the values:

```bash
cp .env.example .env.local
```

At minimum, set these in `.env.local`:

| Variable | Source |
|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk dashboard → API Keys (needed for E2E tests only) |
| `CONVEX_DEPLOYMENT` | Auto-set by `npx convex dev` |
| `VITE_CONVEX_URL` | Auto-set by `npx convex dev` |

### 5. Run the Dev Servers

You need **two terminals** — one for Convex and one for Vite:

```bash
# Terminal 1: Convex dev server (watches convex/ for changes, syncs functions)
npx convex dev
```

```bash
# Terminal 2: Vite dev server (frontend)
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

## Usage

1. **Sign in** — type any name and email. The first user automatically becomes an Admin.
2. **Dashboard** — see department cards with question counts. Tap a department to start an audit.
3. **Audit** — answer each question (Yes / No / Partial). The app auto-advances to the next card. Use the dot navigator to jump around or go back.
4. **Results** — view your score instantly after completing an audit, broken down by risk category.
5. **History** — check score trends over time and filter by department.
6. **Team** — invite team members and manage roles (Admin only).
7. **Settings** — edit company name/logo, add/edit/delete questions, reset to defaults (Admin only).

## Data Persistence

All data is stored in `localStorage` with the `pcr_` prefix:

| Key | Contents |
|---|---|
| `pcr_currentUser` | Current logged-in user |
| `pcr_users` | All registered users |
| `pcr_company` | Company name and logo |
| `pcr_departments` | Departments and questions |
| `pcr_sessions` | Completed audit sessions |
| `pcr_invitations` | Pending team invitations |

To reset all data, clear localStorage in the browser devtools or click "Reset to defaults" in Settings.

## License

Private — not licensed for redistribution.

  For routine deploys (no migrations): Option B works great — npx convex deploy --yes && npm run build in Cloudflare.

  For migration deploys: You'll always need to do it manually:
  1. Deploy permissive schema: npx convex deploy --yes
  2. Run migration: npx convex run --prod migrations/whatever:run
  3. Tighten schema, push to trigger final deploy