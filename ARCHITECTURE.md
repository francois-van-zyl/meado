# Meado — Architecture

This document explains how Meado is put together — the data model, how the pieces connect, and how information flows through the system. It's written for both developers who will write code and non-technical collaborators who want to understand how it works.

---

## The big picture

Meado is a web application with three layers:

```
┌─────────────────────────────────────────┐
│           Browser (the user)            │
│   Next.js pages rendered in React       │
└──────────────────┬──────────────────────┘
                   │ reads/writes data
┌──────────────────▼──────────────────────┐
│         Supabase (the database)         │
│   PostgreSQL + Auth + Row Level Security│
└─────────────────────────────────────────┘
                   │ deployed via
┌──────────────────▼──────────────────────┐
│           Vercel (the hosting)          │
│   Automatic deploys from GitHub         │
└─────────────────────────────────────────┘
```

In plain English: the user opens Meado in a browser, the pages are built with React (a JavaScript framework), and all the data lives in a PostgreSQL database hosted by Supabase. The whole thing is deployed automatically to Vercel whenever code is pushed to GitHub.

---

## The data model

Five database tables hold everything:

### profiles
One row per user. Extends Supabase's built-in auth system.

| Column | Type | What it stores |
|---|---|---|
| id | UUID | Links to auth.users — the user's identity |
| display_name | text | Set during onboarding — null means onboarding not complete |
| currency | text | e.g. 'ZAR', 'USD' — set during onboarding |
| level | integer | Calculated from total_xp |
| total_xp | integer | Total Seeds earned lifetime (called XP in the database) |
| current_streak | integer | Consecutive days with at least one completion |
| longest_streak | integer | Best streak ever |
| last_active_date | date | Last day the user completed a habit |

### habits
One row per habit per user.

| Column | Type | What it stores |
|---|---|---|
| id | UUID | Unique habit identifier |
| user_id | UUID | Links to profiles |
| name | text | e.g. "Drink 2L water" |
| category | text | 'health', 'fitness', 'finance', or 'mental_health' |
| icon | text | Emoji e.g. "💧" |
| xp_value | integer | Seeds earned per completion (5–50) |
| is_active | boolean | Hidden habits stay in DB but don't appear in daily view |

### habit_completions
One row per habit per day when completed.

| Column | Type | What it stores |
|---|---|---|
| id | UUID | Unique completion identifier |
| user_id | UUID | Links to profiles |
| habit_id | UUID | Links to habits |
| completed_date | date | The date the habit was completed (local time) |
| xp_earned | integer | Seeds awarded (xp_value × streak multiplier) |
| streak_multiplier | decimal | e.g. 1.5 for a 7-day streak |

There is a UNIQUE constraint on (habit_id, completed_date) — you cannot complete the same habit twice on the same day.

### rewards
One row per reward per user.

| Column | Type | What it stores |
|---|---|---|
| id | UUID | Unique reward identifier |
| user_id | UUID | Links to profiles |
| name | text | e.g. "Rest day" |
| category | text | 'digital', 'real_world', or 'boss_battle' |
| unlock_condition | jsonb | e.g. {"type":"streak","value":7} or {"type":"seeds","value":500} or null (always claimable) |
| is_redeemed | boolean | Whether the reward has been claimed |
| redeemed_at | timestamptz | When it was claimed |

### boss_battles
One row per week per user.

| Column | Type | What it stores |
|---|---|---|
| id | UUID | Unique battle identifier |
| user_id | UUID | Links to profiles |
| week_start | date | Monday of the current week |
| week_end | date | Sunday of the current week |
| target_completion_pct | integer | The % target (default 80) |
| is_won | boolean | Whether the user hit their target |
| actual_completion_pct | decimal | Calculated at end of week |

---

## Security model

Every table has **Row Level Security (RLS)** enabled. This means:

- The database itself enforces that users can only read and write their own data
- Even if there's a bug in the application code, a user cannot see another user's habits, completions, or rewards
- The policy is simple: `auth.uid() = user_id` — the logged-in user's ID must match the row's user_id

This is enforced at the PostgreSQL level, not the application level. It cannot be bypassed by application code.

---

## How routing works

Route protection lives in `proxy.ts` (not `middleware.ts` — Next.js 16 uses proxy.ts as the middleware entry point).

The routing logic:

```
User visits a URL
        │
        ▼
Are they authenticated?
        │
   No ──┼──► Redirect to /login
        │
       Yes
        │
        ▼
Are they visiting /login, /signup, or /confirm?
        │
       Yes ──► Do they have a display_name?
               │
          No ──┼──► Redirect to /onboarding
               │
              Yes ──► Redirect to /dashboard
        │
       No
        │
        ▼
Are they visiting /dashboard?
        │
       Yes ──► Do they have a display_name?
               │
          No ──┼──► Redirect to /onboarding
               │
              Yes ──► Allow through
        │
       No
        │
        ▼
Allow through (all other routes)
```

**The key insight:** `display_name` in the profiles table is the onboarding completion gate. Null = new user who needs onboarding. Filled = ready for the dashboard.

---

## How Seeds (XP) and levelling work

Seeds are earned by completing habits. The level is calculated from total Seeds:

```
Level = floor(sqrt(total_xp / 100)) + 1
```

This creates a square root progression curve — early levels are fast and encouraging, later levels require sustained effort.

**Streak multipliers:**
- 3-day streak: 1.25× Seeds per completion
- 7-day streak: 1.5× Seeds
- 14-day streak: 1.75× Seeds
- 30-day streak: 2.0× Seeds

All calculations live in `lib/xp.ts`.

---

## How streaks work

The streak calculation lives in `lib/streaks.ts`.

A streak is a consecutive chain of days with at least one habit completion, counting backward from today (or yesterday if today has no completions yet).

**Important:** All date calculations use local time, not UTC. Using `toISOString()` (which returns UTC) caused a bug in UTC+2 timezone where dates rolled back to the previous day. The fix is to always use `getFullYear()`, `getMonth()`, and `getDate()` methods which respect the local timezone.

---

## How the boss battle works

At the start of each week (Monday), a boss battle row is created for the user with a randomly selected disturbance name. The weekly progress is calculated as:

```
Progress = completions this week / (active habits × days elapsed this week) × 100
```

If the user hits their target percentage, the battle is marked as won.

---

## Key files reference

| File | What it does |
|---|---|
| `proxy.ts` | Route protection — checks auth and onboarding status on every request |
| `app/auth/callback/route.ts` | Handles Supabase email confirmation redirect |
| `app/onboarding/page.tsx` | 8-step wizard — the only place that writes initial habits and rewards |
| `app/dashboard/page.tsx` | Main daily view — the core habit completion loop |
| `lib/xp.ts` | Level formula, Seeds-to-next-level, streak multiplier calculations |
| `lib/streaks.ts` | Streak calculation from an array of completion dates |
| `lib/supabase/client.ts` | Browser-side Supabase client (use in 'use client' components) |
| `lib/supabase/server.ts` | Server-side Supabase client (use in Server Components) |
| `types/index.ts` | TypeScript types matching every database table |
| `supabase/migrations/001_initial.sql` | Complete database schema — run this once in Supabase SQL Editor |

---

## What Build 2 adds

Build 2 will add a pixel art visual layer on top of Build 1's logic. The `components/MeadowScene.tsx` placeholder already exists and accepts these props:

```typescript
interface MeadowSceneProps {
  streakDays: number
  completedCategories: string[]
  weekProgress: number
}
```

In Build 2, this component will render a pixel art meadow scene that evolves based on streak length, shows category-specific buildings, and displays weather effects tied to the weekly disturbance progress. The habit logic underneath stays completely unchanged.

---

*Last updated: March 2026*
*Maintained by: Francois van Zyl · Fimiliar*
