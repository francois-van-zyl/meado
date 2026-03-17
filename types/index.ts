export interface Profile {
  id: string
  username: string
  display_name: string
  currency: string
  timezone: string
  level: number
  total_xp: number
  current_streak: number
  longest_streak: number
  last_active_date: string
  created_at: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  description: string
  category: 'health' | 'fitness' | 'finance' | 'mental_health'
  icon: string
  xp_value: number
  color: string
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
  description: string
  category: 'digital' | 'real_world' | 'boss_battle'
  xp_cost: number
  unlock_condition: Record<string, unknown>
  is_redeemed: boolean
  redeemed_at: string
  created_at: string
}

export interface BossBattle {
  id: string
  user_id: string
  week_start: string
  week_end: string
  target_completion_pct: number
  reward_id: string
  is_won: boolean
  actual_completion_pct: number
  created_at: string
}
