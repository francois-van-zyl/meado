# Meado — Decision Log

This file records every meaningful architectural, design, and product 
decision made during the build. The goal is to explain not just *what* 
was built, but *why* — so that anyone picking this up later (a developer, 
a collaborator, or a future version of the builder) understands the 
reasoning and doesn't have to reverse-engineer intent from code.

Each entry includes the decision, the alternatives that were considered, 
the reasoning, and any known trade-offs.

---

## How to read this file

Entries are in chronological order — earliest decisions first. Each has:
- **Date** — when the decision was made
- **Decision** — what was chosen
- **Alternatives considered** — what else was on the table
- **Reasoning** — why this option won
- **Trade-offs** — what we gave up or accepted

---

## Product decisions

---

### 001 · Positive reinforcement framing
**Date:** March 2026

**Decision:** Frame the entire system around restoring calm to a world 
(meadow, cottage, forest) rather than defeating enemies or avoiding 
punishment.

**Alternatives considered:**
- Classic RPG combat framing (fight demons, defeat bosses, take damage 
  for missed habits)
- Neutral productivity framing (just a tracker with points)

**Reasoning:** Threat-based mechanics spike cortisol — the stress hormone 
— which is physiologically the opposite of what habit-building requires. 
Sustained behaviour change is built on positive anticipation, not fear of 
consequences. The "restoring something beautiful" framing taps into 
nurturing instincts and creates a calm feedback loop. The weekly "boss" 
becomes a "disturbance" — something gentle and atmospheric (fog, heavy 
rain, overgrown path) rather than threatening.

**Trade-offs:** Some users are genuinely motivated by combat framing. We 
accept that this system is not for them. The target user is someone who 
has tried aggressive productivity systems and found them anxiety-inducing.

---

### 002 · Cottagecore aesthetic
**Date:** March 2026

**Decision:** Warm cream palette, earthy category colours, serif/rounded 
type pairing (Lora + Nunito), soft language throughout.

**Alternatives considered:**
- Dark RPG aesthetic (original plan: dark mode, gold accents, Syne font)
- Clean minimal productivity aesthetic (white, grey, system fonts)

**Reasoning:** The visual language must match the psychological framing. 
A dark RPG dashboard creates tension and urgency — exactly what we're 
trying to avoid. Cottagecore aesthetics are associated with slowness, 
care, and domestic calm. The warm cream base reduces eye strain, which 
matters for a tool people open first thing in the morning.

**Trade-offs:** Cottagecore is a trend with a cultural moment — it may 
feel dated in a few years. We accept this because (a) the core palette 
is actually just warm neutrals, which are timeless, and (b) the pixel 
art layer in Build 2 will evolve the aesthetic forward.

---

### 003 · Four habit categories
**Date:** March 2026

**Decision:** Health, Fitness, Finance, and Mental Health as the four 
fixed categories. Users can't create custom categories.

**Alternatives considered:**
- Fully open category creation
- More categories (e.g. Relationships, Career, Learning)
- Fewer categories (e.g. just Body and Mind)

**Reasoning:** Decision fatigue is the enemy of onboarding. Four 
categories is enough to cover the major life areas where daily habits 
make a meaningful difference, and few enough that the choice is not 
overwhelming. Fixing the categories also allows us to design specific 
colour coding, icon systems, and preset habit libraries for each one. 
Custom categories would require designing a generic system that fits 
nothing perfectly.

**Trade-offs:** Some users will want a category we haven't included. 
The custom habit field within each category partially compensates — 
you can track anything, just under one of four umbrellas.

---

### 004 · Holistic reward guardrails
**Date:** March 2026

**Decision:** If a user has Finance habits active, spend-based rewards 
are automatically filtered out of the reward picker.

**Alternatives considered:**
- No filtering — user picks any reward they want
- Warning labels on incompatible rewards without filtering

**Reasoning:** The system should reinforce internal consistency. 
Rewarding yourself with a shopping trip while actively tracking a 
"no unplanned spend" habit is self-defeating and would quietly erode 
trust in the system. The filter is a nudge, not a rule — it happens 
silently during onboarding, not as a lecture.

**Trade-offs:** Some users might want to save all week and then spend 
as a deliberate reward. A future version could allow this with an 
explicit "this is an intentional treat budget" toggle.

---

### 005 · Pixel art deferred to Build 2
**Date:** March 2026

**Decision:** All pixel art visual elements (meadow scenes, buildings, 
animals, weather effects) are deferred to a second build phase.

**Alternatives considered:**
- Building both phases simultaneously
- Using free pixel art asset packs immediately

**Reasoning:** The habit tracking loop is the product. The pixel art 
is the delight layer. Combining them risks either delaying the working 
system by weeks, or shipping rushed visuals that undermine the calm 
aesthetic. Build 1 proves the system works and surfaces UX issues 
before the visual world is built on top of it. Build 1 includes a 
`<MeadowScene />` component placeholder that accepts the right props, 
so Build 2 is a swap, not a refactor.

**Trade-offs:** The app will feel visually incomplete during the Build 
1 period. The cottagecore language and palette carry the mood well 
enough that this is acceptable for personal use and early rollout.

---

## Architecture decisions

---

### 006 · Supabase over Firebase
**Date:** March 2026

**Decision:** Supabase as the backend, database, and auth provider.

**Alternatives considered:**
- Firebase (Google) — similar free tier, popular, large ecosystem
- Browser localStorage only — no backend, single device, no auth
- PlanetScale + custom auth — more control, much more complexity

**Reasoning:** Supabase uses PostgreSQL, which is the world's most 
widely used relational database. Skills learned here transfer 
everywhere. Firebase uses a NoSQL document model that requires 
different thinking and doesn't match the relational nature of this 
data (users have habits, habits have completions, completions have 
dates — this is naturally relational). Supabase also has Row Level 
Security built in at the database level, which means multi-user data 
isolation is handled by the database itself, not by application code.

**Trade-offs:** Supabase free tier limits: 500MB storage, 2 active 
projects, 50,000 monthly active users. More than sufficient for this 
use case, but worth knowing.

---

### 007 · Next.js 14 (upgraded to 16) with App Router
**Date:** March 2026

**Decision:** Next.js using the App Router (not the older Pages Router).
Started with 14, upgraded to 16 during Session 1 due to version 
conflicts.

**Alternatives considered:**
- Plain React with Vite — simpler setup, no framework conventions
- Next.js with Pages Router — older, more tutorials available
- Remix — excellent but smaller community, fewer resources

**Reasoning:** Next.js App Router is the current standard for new 
Next.js projects. Vercel (the hosting platform) is made by the same 
company as Next.js — the two are optimised for each other. Free 
hosting, automatic deployments, and no configuration needed.

**Trade-offs:** Next.js 16 uses proxy.ts instead of middleware.ts — 
a change from Next.js 14 that most tutorials don't mention. Having 
both files causes a silent blank screen error. All routing logic 
must live in proxy.ts only.

---

### 008 · Row Level Security for multi-user isolation
**Date:** March 2026

**Decision:** All database tables have Row Level Security (RLS) 
policies enabled from day one.

**Alternatives considered:**
- Filter by user ID in application code only
- Build multi-user support later

**Reasoning:** RLS is a database-level guarantee that a user can 
only read and write their own data. Without it, a bug in the 
application code could accidentally expose one user's data to 
another. With RLS, even a badly written query cannot return another 
user's records — the database refuses. This is the industry standard 
approach and should be built in from the start, not retrofitted.

**Trade-offs:** RLS policies add a small amount of complexity to the 
database setup. They must be configured correctly — a misconfigured 
policy can accidentally block all access.

---

### 009 · XP levelling formula
**Date:** March 2026

**Decision:** `Level = floor(sqrt(total_xp / 100)) + 1`

**Alternatives considered:**
- Linear levelling (same XP required per level)
- Exponential levelling (increasingly steep — common in games)
- Fixed XP thresholds per level (manually defined table)

**Reasoning:** Square root progression means early levels feel fast 
and achievable (important for onboarding and building momentum), 
while later levels require sustained effort without feeling 
impossible. A new user can reach Level 2 with a single good week. 
Reaching Level 10 requires months of consistent effort. The formula 
is a single line of code that scales forever — no table to maintain.

**Trade-offs:** The curve is not hand-tuned, so some levels may feel 
too quick or too slow as real usage data comes in. Adjustable in a 
future update by changing the constant (currently 100).

---

### 010 · Streak multipliers over bonus habits
**Date:** March 2026

**Decision:** Reward streaks with XP multipliers (1.25x at 3 days, 
up to 2x at 30 days) rather than unlocking bonus habits or 
additional mechanics.

**Alternatives considered:**
- Bonus habits unlocked by streaks
- Streak-based cosmetic unlocks only
- No streak mechanic at all

**Reasoning:** Multipliers are invisible complexity — they reward 
the user without asking anything extra of them. The habit list stays 
the same, the interface stays clean, but the numbers feel more 
satisfying. Bonus habits would increase cognitive load on exactly 
the days when a user is most fragile (early in a streak).

**Trade-offs:** Multipliers can feel abstract. The UI must make them 
visible and satisfying — the "1.5× seeds" badge in the streak row 
serves this purpose.

---

## Design decisions

---

### 011 · Lora + Nunito type pairing
**Date:** March 2026

**Decision:** Lora (serif) for headings, boss names, and section 
labels. Nunito (rounded sans-serif) for body text, habit names, 
and UI labels.

**Alternatives considered:**
- Playfair Display + DM Sans (more dramatic contrast)
- Syne + DM Sans (original dark RPG plan)
- Single font family throughout

**Reasoning:** Lora has a handwritten quality that evokes journal 
entries and old recipe books — both cottagecore touchstones. 
Nunito's rounded terminals soften the UI and feel friendly rather 
than clinical. The serif/rounded-sans pairing creates warmth without 
sacrificing readability. Both are available free on Google Fonts.

**Trade-offs:** Lora can feel slow to read at small sizes. It is 
only used at 14px and above, and never for dense information.

---

### 012 · Seeds as the XP currency name
**Date:** March 2026

**Decision:** XP points are called "Seeds" throughout the interface. 
The XP progress bar is labelled "Bloom."

**Alternatives considered:**
- XP (generic, fine)
- Petals, Roots, Spores, Sparks

**Reasoning:** Seeds are the right metaphor — you plant them through 
daily effort, and they eventually bloom into rewards and level 
progression. The word is universally understood, doesn't require 
explanation, and fits naturally into sentences ("earning 1.5× 
seeds"). Bloom as the progress bar label reinforces the metaphor 
without over-explaining it.

**Trade-offs:** Some users may not immediately connect "Seeds" to 
progress points. A first-time tooltip on the dashboard explains 
it once.

---

### 013 · Product name — Meado
**Date:** March 2026

**Decision:** Name the product Meado, with the brand line 
*"Tend to yourself, every day."*

**Alternatives considered:**
- HabitQuest (original working title — generic, RPG-coded)
- Meadow (crowded: cannabis POS at getmeadow.com, therapy app 
  on App Store, AR platform at meadow.space)
- Medo (too abstract, conflicts with Medeo telemedicine)
- Grove, Glade, Wren, Kept, Fieldnotes, Fieldwork, Still 
  (all considered across multiple naming rounds)

**Reasoning:** Meado is a compression of Meadow that embeds three 
meanings simultaneously: Me (personal ownership), Do (daily action), 
Meadow (the world being tended). The name works as a brand, as a 
place ("your meado"), and as a quiet psychological nudge. The ME + 
DO reading reinforces the core premise: the user is the agent of 
their own restoration.

**Trade-offs:** meado.io is taken by a South African logistics 
company (also Cape Town-based). Primary domain strategy is 
meado.app or a prefix variant. No wellness or habit-tracking 
product currently uses the Meado name.

---

### 014 · Habit backfill policy — 24 hour grace window
**Date:** March 2026

**Decision:** Users can mark habits complete for yesterday only.
Anything older than 24 hours is permanently locked.

**Alternatives considered:**
- Full lock (today only) — too punishing for genuine forgetfulness
- Open backfill (any past date) — gameable, erodes streak integrity
- 48-72 hour window — too generous, removes accountability

**Reasoning:** The 24-hour grace window covers the most common 
real-world case: you had a good day, forgot to open Meado, and 
want to record it the next morning. It trusts the user without 
opening the door to retroactive streak manipulation.

Streaks should reflect reality. The grace window exists for 
forgetfulness, not revision.

**Trade-offs:** A user who genuinely did their habits two days ago 
but forgot to log them loses those completions. We accept this — 
the app is a daily practice, and logging is part of the practice.

---

### 015 · Habit undo mechanism — permanent daily toggle
**Date:** March 2026

**Decision:** Tapping a completed habit un-completes it. Permanent 
toggle within the current day — no time limit. Yesterday's 
backfilled habits lock immediately on completion. All habits lock 
at midnight when the date rolls over.

**Alternatives considered:**
- 5-second undo pill (built, then replaced) — added UI complexity, 
  easy to miss on mobile
- Long press to undo — too much friction
- Time-limited toggle (2-5 minutes) — unnecessary complexity

**Reasoning:** Tap to complete, tap to undo is the most intuitive 
pattern on mobile. The date boundary is the integrity mechanism — 
not the undo window. Simple rules are more trustworthy than 
complex ones.

---

*Last updated: March 2026*
*Maintained by: Francois · Fimiliar*