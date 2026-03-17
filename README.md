# Meado 🌿
### *Tend to yourself, every day*

Meado is a habit tracking web app built around calm, positive reinforcement. Instead of fighting enemies or avoiding punishment, you tend a meadow — completing daily habits restores peace to your world, lifts weekly disturbances, and unlocks real-world rewards.

The name carries three meanings: **Me** (personal), **Do** (daily action), **Meadow** (the world you're tending).

---

## What it does

- **Daily habit tracking** across four life categories: Health, Fitness, Finance, and Mental Health
- **Seeds and levelling** — earn Seeds (XP) for each habit, level up over time with a streak multiplier system
- **Weekly disturbances** — atmospheric boss battles (The Wandering Fog, The Overgrown Path) that clear when you hit your weekly habit target
- **Rewards system** — streak-gated and Seeds-gated real-world treats that unlock as you progress
- **Garden Log** — streak history, 28-day completion grid, 7-day chart, boss battle record
- **ADHD-friendly onboarding** — 8-step guided wizard, one decision per screen, 2 minutes to set up
- **Multi-user ready** — each user's data is completely isolated via Supabase Row Level Security
- **24-hour grace window** — backfill yesterday's habits if you forgot to log

---

## Tech stack

| Layer | Tool | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) | React framework, free Vercel hosting, file-based routing |
| Styling | Tailwind CSS | Utility-first CSS, fast to build and maintain |
| Components | shadcn/ui | Pre-built accessible component primitives |
| Animation | Framer Motion | Smooth habit completion animations |
| Database | Supabase (PostgreSQL) | Free tier, built-in auth, row-level security |
| Hosting | Vercel | Git push to deploy, free tier, automatic HTTPS |
| Auth | Supabase Auth | Email/password and magic link, no cost |

---

## Project structure

```
meado/
├── app/
│   ├── (auth)/                   # Login, signup, confirmation pages
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   ├── confirm/page.tsx
│   │   └── layout.tsx
│   ├── auth/callback/route.ts    # Supabase auth callback handler
│   ├── onboarding/page.tsx       # 8-step setup wizard
│   └── dashboard/
│       ├── page.tsx              # Main daily habit view
│       ├── layout.tsx            # Sidebar + bottom nav
│       ├── habits/page.tsx       # Habit management (add, edit, delete)
│       ├── rewards/page.tsx      # Reward progress and claiming
│       └── log/page.tsx          # Garden log — stats and history
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   └── MeadowScene.tsx           # Placeholder for Build 2 pixel art
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser-side Supabase client
│   │   └── server.ts             # Server-side Supabase client
│   ├── xp.ts                     # Level and Seeds calculations
│   └── streaks.ts                # Streak calculation (local time aware)
├── hooks/                        # React data hooks
├── types/index.ts                # TypeScript types for all DB tables
├── proxy.ts                      # Route protection and auth middleware
├── supabase/
│   └── migrations/
│       └── 001_initial.sql       # Full database schema
├── README.md                     # This file
├── DECISIONS.md                  # Why things were built the way they were
├── JOURNAL.md                    # Session-by-session build log
├── CONTRIBUTING.md               # How to contribute
└── ARCHITECTURE.md               # How the pieces fit together
```

---

## Running locally

**Prerequisites:** Node.js v20+ installed on your machine.

**1. Clone the repository:**
```bash
git clone https://github.com/francois-van-zyl/meado.git
cd meado
```

**2. Install dependencies:**
```bash
npm install
```

**3. Set up environment variables:**
```bash
cp .env.example .env.local
```
Then open `.env.local` and fill in your Supabase credentials.

**4. Set up the database:**
- Create a free project at [supabase.com](https://supabase.com)
- Go to SQL Editor → paste the contents of `supabase/migrations/001_initial.sql` → Run
- Go to Project Settings → API → copy your Project URL and anon key

**5. Add credentials to `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**6. Run the development server:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploying to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Click Deploy

Every `git push` to main auto-deploys.

**After deploying:**
- Go to Supabase → Authentication → URL Configuration
- Set Site URL to your Vercel URL
- Add `https://your-app.vercel.app/auth/callback` to Redirect URLs

---

## Multi-user support

Anyone who visits the deployed URL can create an account. Each user's data is completely isolated — enforced at the database level via Row Level Security.

To restrict signups: Supabase → Authentication → disable "Enable email signups".

---

## Roadmap

### Build 1 ✅ (current)
- [x] 8-step ADHD-friendly onboarding wizard
- [x] Daily habit tracking with Seeds, streaks, and multipliers
- [x] Tap to complete, tap to undo (same day)
- [x] 24-hour grace window for yesterday's habits
- [x] Weekly disturbance mechanic with progress tracking
- [x] Rewards system with progress bars and claiming
- [x] Habits management — add, edit, hide, delete
- [x] Garden Log — streaks, 28-day grid, 7-day chart, boss record
- [x] Multi-user support with Row Level Security
- [x] Holistic reward guardrails (finance habits filter spend rewards)

### Build 2 (planned)
- [ ] Pixel art visual layer — meadow scenes, buildings, animals
- [ ] Meadow that visually grows with streak progress
- [ ] Category buildings unlock as habits are maintained
- [ ] Animated weather effects tied to weekly disturbance progress
- [ ] Animal visitors as streak rewards (rabbit → fox → deer)
- [ ] Mobile app wrapper via Capacitor

---

## Documentation

| File | Purpose |
|---|---|
| `README.md` | Project overview and setup instructions |
| `DECISIONS.md` | Every architectural and design decision, with reasoning |
| `JOURNAL.md` | Session-by-session build log |
| `CONTRIBUTING.md` | How to contribute and work on the codebase |
| `ARCHITECTURE.md` | How the system fits together |

---

## Built by

Francois van Zyl · [Fimiliar](https://fimiliar.com)

*Meado — Tend to yourself, every day.*
