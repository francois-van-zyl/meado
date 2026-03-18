/**
 * types/index.ts
 *
 * TypeScript interfaces mirroring the Supabase database schema. Import
 * these wherever row data is passed between functions or stored in state.
 *
 * Note: unlock_condition on Reward is typed as Record<string, unknown>
 * because JSONB is schema-less at the database level. The actual runtime
 * shape is { type: 'streak' | 'seeds', value: number } — see
 * app/dashboard/rewards/page.tsx for the local UnlockCondition type that
 * narrows this for use in that page.
 */
export interface Profile {
  id: string
  username: string | null
  display_name: string | null
  currency: string
  timezone: string
  level: number
  total_xp: number
  current_streak: number
  longest_streak: number
  last_active_date: string | null
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string | null
  category: 'health' | 'fitness' | 'finance' | 'mental_health'
  icon: string | null
  xp_value: number
  color: string | null
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface HabitCompletion {
  id: string
  user_id: string
  habit_id: string
  completed_date: string
  xp_earned: number
  streak_multiplier: number
  created_at: string
}

export interface Reward {
  id: string
  user_id: string
  name: string
  description: string | null
  category: 'digital' | 'real_world' | 'boss_battle'
  xp_cost: number | null
  unlock_condition: Record<string, unknown> | null
  is_redeemed: boolean
  redeemed_at: string | null
  created_at: string
}

export interface BossBattle {
  id: string
  user_id: string
  week_start: string
  week_end: string
  target_completion_pct: number
  reward_id: string | null
  is_won: boolean
  actual_completion_pct: number | null
  created_at: string
}
