# Meado — Build Journal

This is the session-by-session log of building Meado. Written for 
two audiences: a future developer who needs context, and the builder 
themselves — as a record of what was learned, what broke, and how 
decisions evolved in practice.

Entries are honest. If something was confusing, that goes in. If 
something didn't work the first time, that goes in too. That's what 
makes a build journal useful.

---

## How to write an entry

At the end of each session, add a new entry using this template:
```
### Session [number] — [short title]
**Date:** [date]
**Phase:** [which phase from the build plan]
**Duration:** [roughly how long]

**What we did:**
**What worked:**
**What didn't work / what broke:**
**What I learned:**
**Open questions:**
**Next session:**
```

---

## Pre-build

### Session 0 — Planning, design, and naming
**Date:** March 2026
**Phase:** Pre-build
**Duration:** ~4 hours across multiple conversations

**What we did:**
Defined the full product concept for Meado. Started with a dark RPG 
framing and the working title HabitQuest, pivoted to a cottagecore 
positive reinforcement theme after recognising that threat-based 
mechanics work against the psychological goals of habit building.

Ran a full naming process across three rounds: evaluated Meadow 
(crowded with conflicts), iterated through Grove, Glade, Wren, Kept, 
Fieldnotes, Fieldwork, Still, and others before arriving at Meado — 
a compression of Meadow that embeds Me + Do as a secondary reading.

Produced four core documents:
- `Meado_Build_Plan.md` — full technical spec, database schema, 
  onboarding flow, 15 Claude Code prompts across 6 phases
- `DECISIONS.md` — architectural and design reasoning
- `README.md` — project overview and setup instructions
- `JOURNAL.md` — this file

Key product decisions made:
- Name: Meado — *Tend to yourself, every day*
- Stack: Next.js 14 + Supabase + Vercel (all free)
- Pixel art visual layer deferred to Build 2
- `<MeadowScene />` placeholder component planned for Phase 1
- Four fixed habit categories: Health, Fitness, Finance, Mental Health
- XP currency called Seeds, progress bar labelled Bloom
- Weekly bosses reframed as atmospheric disturbances

**What worked:**
The pivot to cottagecore happened quickly and improved the product 
significantly. The naming process surfaced a genuinely distinctive 
name with layered meaning. The ME + DO insight came from the founder.

**What didn't work:**
Initial scope was too ambitious for Build 1 — pixel art considered 
for immediate inclusion before recognising it would delay the core 
habit loop. First naming rounds were too focused on nature words 
rather than starting from the feeling.

**What I learned:**
The habit tracking loop is the product. Everything else is the 
delight layer. Ship the loop first. On naming: the best names don't 
describe — they evoke. Start from feeling, not function.

**Open questions:**
- Check meado.app and meado.co availability before launch
- Should onboarding be skippable for users added by an admin?

**Next session:**
Install Node.js and Claude Code on Mac. Begin Session 1.

---

## Build sessions

---

### Session 1 — Project scaffold and foundation
**Date:** 17 March 2026
**Phase:** Phase 1 — Project Setup
**Duration:** ~2 hours

**What we did:**
Set up the Meado project from scratch. Installed Next.js 16, Tailwind 
CSS, Supabase, shadcn/ui, framer-motion, and supporting libraries. 
Created the Supabase database with all 5 tables (profiles, habits, 
habit_completions, rewards, boss_battles), row level security policies, 
and the auto-profile trigger. Connected Supabase to the local project 
via .env.local.

**What worked:**
The Supabase SQL ran cleanly after one small fix (the $$ delimiter 
issue). The Meado warm cream palette loaded immediately — visible on 
the default Next.js placeholder page. Port 3000 running cleanly by 
end of session.

**What didn't work / what broke:**
- Next.js version mismatch — project was created with 14.2.35 but 
  installed 16.1.7, causing module errors
- eslint-config-next and @types/react were also mismatched and needed 
  updating together
- npm permissions error on the cache folder (fixed with sudo chown)
- .next lock file got stuck (fixed by deleting the .next folder)
- globals.css had shadcn-specific Tailwind classes that didn't exist 
  yet (border-border) — replaced with plain CSS variables

**What I learned:**
When starting a new Next.js project, version mismatches between next, 
eslint-config-next, and @types/react are common. Always update them 
together, not one at a time. The .next folder can be safely deleted 
anytime — it's just compiled cache, not source code.

**Open questions:**
- The warn messages about @types/react peer dependencies — worth 
  monitoring but not blocking anything right now

**Next session:**
Session 2 — Auth pages (login and signup)

---

### Session 2 — Auth pages
**Date:** 17 March 2026
**Phase:** Phase 2 — Auth
**Duration:** ~1 hour

**What we did:**
Built the login, signup, and email confirmation pages. Connected the 
full auth flow — signup → confirmation email → callback → onboarding. 
Added middleware logic to check whether a user has completed 
onboarding (display_name exists) and route them correctly.

**What worked:**
The login page looked exactly right on first build — warm cream 
background, sage green button, rolling meadow horizon. Auth flow 
worked end to end. Middleware correctly routes new users to 
/onboarding.

**What didn't work / what broke:**
After email confirmation, users were landing on /dashboard instead 
of /onboarding. Fixed by updating the callback route and middleware 
to check display_name before deciding where to redirect.

**What I learned:**
The display_name field in the profiles table is the signal that 
tells the whole app whether a user has completed onboarding. 
Empty = new user. Filled = ready for dashboard. One field, used 
as a gate across the whole app.

**Key discovery — Next.js 16 uses proxy.ts not middleware.ts:**
Having both middleware.ts and proxy.ts caused a silent build error 
that showed as a blank white screen with no error message.

Fix: delete middleware.ts, merge all routing logic into proxy.ts.

Routing logic in proxy.ts:
- Unauthenticated → /dashboard or /onboarding → redirect to /login
- Authenticated → /login, /signup, /confirm → /onboarding or 
  /dashboard based on whether display_name exists
- Authenticated → /dashboard, no display_name → /onboarding
- Authenticated → /dashboard, has display_name → allow through
- Authenticated → /onboarding → allow through

**Open questions:**
- Supabase free tier won't let you delete users who have related 
  profile rows. Use + email aliases for testing new signups 
  (you+test1@gmail.com) or manually null out display_name in 
  the profiles table to re-test onboarding.

**Next session:**
Session 3 — Onboarding wizard

---

### Session 3 — Onboarding wizard
**Date:** 17 March 2026
**Phase:** Phase 3 — Onboarding
**Duration:** ~2 hours

**What we did:**
Built the full 8-step onboarding wizard at app/onboarding/page.tsx.
Steps cover: welcome, name, currency, categories, habit selection, 
rewards, boss battle setup, and completion summary.

On the final step, the wizard writes to Supabase:
- Updates profiles table with display_name and currency
- Inserts selected habits into the habits table
- Inserts selected rewards into the rewards table

**What worked:**
The preset habit library across all four categories built cleanly.
The currency selector, category cards, and habit chips all work as 
multi-select. The boss battle step generates a random disturbance 
name and updates the preview text dynamically. Finance guardrail 
working — spend-based rewards correctly hidden when Finance category 
is selected. Custom rewards work as dismissible tags.

**What didn't work / what broke:**
Blank white screen on /onboarding with no error message. Root cause 
was a Next.js 16 compatibility issue — proxy.ts vs middleware.ts 
conflict (see Session 2 key discovery).

Tailwind CSS variables (bg-background, text-primary etc.) were not 
resolving initially because they weren't wired into tailwind.config.ts.

**What I learned:**
Silent failures (blank screen, no error) are harder to debug than 
loud failures (red error screen). A blank screen usually means a 
build-level conflict, not a code error. Check for conflicting 
middleware files first.

**Open questions:**
- Habits were duplicating on re-run of onboarding. Fixed in Session 4 
  by deleting existing habits before re-inserting.

**Next session:**
Session 4 — Main dashboard

---

### Session 4 — Main dashboard
**Date:** 17 March 2026
**Phase:** Phase 4 — Dashboard
**Duration:** ~1.5 hours

**What we did:**
Built the main dashboard at app/dashboard/page.tsx. Includes the 
greeting (time-aware: morning/afternoon/evening), Bloom/Seeds bar, 
streak counter with multiplier badge, today's habit list with 
completion toggling, yesterday's habits with 24-hour grace window, 
and the boss battle card.

Built dashboard layout with sidebar navigation (desktop) and bottom 
navigation (mobile).

Created lib/xp.ts with:
- calculateLevel(totalXp)
- xpToNextLevel(totalXp)
- getStreakMultiplier(streakDays)
- getStreakMultiplierLabel(streakDays)

Added two UX features after initial build:
1. Permanent daily toggle — tap to complete, tap again to undo. 
   Locks at midnight.
2. Yesterday backfill — 24-hour grace window. Yesterday's habits 
   shown in a collapsible section, lock immediately on completion, 
   do not affect current streak.

**What worked:**
Everything on first build. Tapping a habit marks it complete, awards 
Seeds, updates the Bloom bar, shows strikethrough. Boss battle card 
rendered correctly — The Overgrown Path, Week 12, 4% restored, 
19 more to lift the fog.

**What didn't work / what broke:**
Habits were duplicating because onboarding was inserting habits on 
every run. Fixed by deleting existing habits and rewards for the user 
before re-inserting on the final onboarding step. Always delete then 
insert — never assume a fresh user.

**What I learned:**
The 5-second undo pill was built then replaced with a simpler tap-to-
toggle. The simpler interaction was more intuitive. When in doubt, 
remove UI elements rather than add them.

Yesterday's completions are fetched in parallel with all other 
dashboard data — no extra round trip. Boss battle correctly handles 
the Monday edge case where yesterday was last week.

**Key decisions made this session:**
- Decision 014: 24-hour grace window for backfill
- Decision 015: Permanent daily toggle for undo

**Open questions:**
- Streak counter showing 0 — streak calculation logic needs wiring 
  up (should increment when all habits complete for the day)
- Test on mobile to confirm bottom navigation renders correctly

**Next session:**
Session 5 — Habits management, Rewards page, Stats/Log page

---

### Session 5 — Supporting pages and streak fix
**Date:** 17 March 2026
**Phase:** Phase 5 — Supporting Pages
**Duration:** ~2 hours

**What we did:**
Built three supporting pages: Habits management, Rewards, and
Garden Log. Fixed the streak calculation. Fixed the rewards page
unlock_condition parsing.

app/dashboard/habits/page.tsx:
- Full CRUD — add, edit, hide, delete habits
- Grouped by category with colour accent bars
- Inline expand forms for add and edit
- Delete confirmation modal
- Seeds possible today pill showing total from active habits only
- XP stepper (− / value / +) replacing number input — founder
  decision, more ADHD-friendly and satisfying on mobile

app/dashboard/rewards/page.tsx:
- Three sections: Blooming, Ready to claim, Claimed
- Progress bars for streak and seeds rewards
- Claim button marks reward as redeemed in Supabase
- "Enjoyed 🌿" badge on claimed rewards with redemption date

app/dashboard/log/page.tsx:
- 2×2 summary cards: streak, longest streak, seeds, habits done
- 7-day CSS bar chart with today highlighted
- 28-day circle grid (4 rows of 7) — filled = at least one
  completion that day
- Boss battle record with trophy/cloud icons

lib/streaks.ts + app/dashboard/page.tsx:
- Fixed UTC vs local time bug — toISOString() was rolling dates
  back to previous day in UTC+2 timezone
- All date calculations now use local time methods
- Supabase write moved outside React state setter

**What worked:**
All three pages built cleanly on first run. Garden log showing
real data immediately — 150 seeds, 12 habits done, correct
7-day chart, single filled dot on day one of the 28-day grid.

**What didn't work / what broke:**
Rewards page showing "undefined-day streak" and NaN% — root
cause was unlock_condition stored with key "value" not "days"
or "amount". Fixed by updating all three helper functions to
use condition.value consistently.

Streak stuck at 0 despite completions — root cause was
toISOString() returning UTC date which was one day behind
local time in Cape Town (UTC+2). Fixed by using local date
methods throughout.

**What I learned:**
Always use local time for date calculations in habit/streak
apps. toISOString() returns UTC — in any timezone offset from
UTC, this silently shifts the date. The bug only surfaces at
night or in non-UTC timezones.

Check what shape data is actually stored in the database before
writing parsing code. The JSONB was {"type":"streak","value":7}
not {"type":"streak","days":7} — a small mismatch that broke
the entire rewards progress display.

**UX decision made this session:**
XP stepper (− / value / +) replaced the number input on the
habit edit form. Founder decision — simpler, more tactile,
prevents invalid input, works better on mobile.

**Open questions:**
- Test on mobile before deployment
- Check meado.app domain availability

**Next session:**
Session 6 — Deploy to Vercel. Meado goes live.

---

## Build 2 planning

*To be started after Build 1 is live and in active use.*

### Pixel art notes
- Free asset packs to evaluate: LimeZu's Tiny Town, Kenney's tileset
- Meadow should have 5 visual states tied to streak length:
  bare → patchy → wildflowers → full bloom → flourishing
- Category buildings: stone cottage (Health), barn (Fitness), 
  market stall (Finance), reading nook (Mental Health)
- Animal rewards: rabbit at day 7, fox at day 14, deer at day 30
- Weekly disturbance as literal pixel weather effect

### UX observations from Build 1 usage
*Add observations here as you use the app daily.*

---

*Maintained by: Francois · Fimiliar*