# Contributing to Meado

Thank you for your interest in contributing to Meado. This document explains how to get set up, how the project is organised, and the conventions we follow. It's written for both developers and non-technical collaborators.

---

## For non-technical collaborators

If you're working on Meado as a designer, product manager, or in any non-coding capacity, here's what you need to know:

**The documentation files are your home base:**
- `DECISIONS.md` — read this to understand why things are the way they are before suggesting changes
- `JOURNAL.md` — the build log, written in plain English
- `README.md` — the project overview

**To suggest a change:**
- Open an Issue on GitHub (click the Issues tab → New Issue)
- Describe what you want to change and why
- Reference a DECISIONS.md entry if it's relevant

**To report a bug:**
- Open an Issue with the label "bug"
- Describe what you expected to happen vs what actually happened
- Include a screenshot if possible

---

## For developers

### Prerequisites

- Node.js v20+
- A Supabase account (free tier is fine)
- A Vercel account (free tier is fine)
- Git

### Getting set up locally

```bash
git clone https://github.com/francois-van-zyl/meado.git
cd meado
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Supabase credentials, then:

```bash
npm run dev
```

See `README.md` for full setup instructions including the database migration step.

### Branch conventions

We use a simple branch naming convention:

| Branch | Purpose |
|---|---|
| `main` | Production — what's live on Vercel |
| `dev` | Active development — merge feature branches here first |
| `feature/[name]` | New features (e.g. `feature/push-notifications`) |
| `fix/[name]` | Bug fixes (e.g. `fix/streak-calculation`) |
| `docs/[name]` | Documentation only changes |

**Never commit directly to `main`.** Always work in a branch and open a Pull Request.

### Commit message conventions

Keep commit messages short and descriptive in the present tense:

```
Add habit reordering via drag and drop
Fix streak calculation on timezone boundary
Update rewards page to handle null unlock_condition
```

Not:
```
Fixed the bug
WIP
changes
```

### Before opening a Pull Request

- Test your change locally end to end
- Make sure `npm run build` completes without errors
- If you changed any architecture or made a meaningful decision, add an entry to `DECISIONS.md`
- If it's a significant change, add a note to `JOURNAL.md`

### Code style

- TypeScript everywhere — no plain `.js` files in `app/` or `lib/`
- All pages that use React state or browser APIs must have `'use client'` at the top
- Use the Supabase browser client (`@/lib/supabase/client`) in client components
- Use the Supabase server client (`@/lib/supabase/server`) in Server Components and route handlers
- Date calculations must use local time methods, never `toISOString()` — see `lib/streaks.ts` for the correct pattern
- Colours must come from the design palette — never introduce new hex values without updating `globals.css`

### Design palette (do not deviate from these)

```
Background:     #FAF6EE
Card:           #EDE5D0
Border:         #D6CBAF
Text primary:   #3D2B1A
Text muted:     #8C6D50
Sage green:     #7A9E7E  (Health, primary actions)
Dusty rose:     #D4858A  (Fitness, boss battle progress)
Honey gold:     #E8A840  (Finance, streak/sun)
Soft lavender:  #A89BC4  (Mental Health)
```

### Key architectural rules

**Routing lives in `proxy.ts` only** — not `middleware.ts`. Next.js 16 uses `proxy.ts` as the middleware entry point. Having both files causes a silent blank screen error.

**display_name is the onboarding gate** — if a user's `profiles.display_name` is null, they haven't completed onboarding. The routing logic uses this as the sole gate for redirecting to `/onboarding`.

**Always delete before inserting in onboarding** — the final onboarding step deletes existing habits and rewards before inserting new ones. This prevents duplication if onboarding is re-run.

**Seeds = XP** — throughout the codebase, `total_xp` is the database column name, but "Seeds" is the display name in the UI. Don't rename the column — just keep the display language consistent.

---

## Questions?

Open an Issue or reach out to Francois directly at [fimiliar.com](https://fimiliar.com).
