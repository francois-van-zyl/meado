# Supabase Setup

## Database Migrations

To set up the database schema:

1. Go to your [Supabase project dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor** in the left sidebar
3. Open `migrations/001_initial.sql` from this folder
4. Paste the entire contents into the SQL Editor
5. Click **Run**

This will create the following tables with Row Level Security enabled:

- `profiles` — extends `auth.users`; auto-created on signup via trigger
- `habits` — user-defined habits with category, XP value, and display settings
- `habit_completions` — daily completion log with streak multipliers
- `rewards` — redeemable rewards (digital, real-world, or boss battle prizes)
- `boss_battles` — weekly challenge tracking tied to a reward

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your project credentials:

```bash
cp .env.example .env.local
```

Find your credentials in the Supabase dashboard under **Project Settings → API**.
