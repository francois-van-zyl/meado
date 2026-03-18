import { NextRequest, NextResponse } from 'next/server'
import { getTodayString } from '@/lib/dates'
import { createClient } from '@/lib/supabase/server'
import { calculateStreak } from '@/lib/streaks'
import { calculateLevel, getStreakMultiplier } from '@/lib/xp'

type ToggleRequestBody = {
  habitId?: string
}

async function getProfileStats(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: completions, error } = await supabase
    .from('habit_completions')
    .select('completed_date, xp_earned')
    .eq('user_id', userId)

  if (error || !completions) {
    return null
  }

  return {
    totalXp: completions.reduce((sum, completion) => sum + completion.xp_earned, 0),
    currentStreak: calculateStreak(completions.map(completion => completion.completed_date)),
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json()) as ToggleRequestBody
  const habitId = body.habitId

  if (!habitId) {
    return NextResponse.json({ error: 'habitId is required' }, { status: 400 })
  }

  const today = getTodayString()

  const [profileRes, habitRes, completionRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_xp, current_streak, longest_streak')
      .eq('id', user.id)
      .single(),
    supabase
      .from('habits')
      .select('id, xp_value')
      .eq('id', habitId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single(),
    supabase
      .from('habit_completions')
      .select('id, xp_earned')
      .eq('user_id', user.id)
      .eq('habit_id', habitId)
      .eq('completed_date', today)
      .maybeSingle(),
  ])

  if (profileRes.error || !profileRes.data) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
  }

  if (habitRes.error || !habitRes.data) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
  }

  const profile = profileRes.data
  const habit = habitRes.data
  const existingCompletion = completionRes.data

  if (existingCompletion) {
    const { error: deleteError } = await supabase
      .from('habit_completions')
      .delete()
      .eq('id', existingCompletion.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to remove completion' }, { status: 500 })
    }

    const stats = await getProfileStats(supabase, user.id)

    if (!stats) {
      return NextResponse.json({ error: 'Failed to recalculate streak' }, { status: 500 })
    }

    const currentStreak = stats.currentStreak
    const longestStreak = profile.longest_streak
    const level = calculateLevel(stats.totalXp)

    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        total_xp: stats.totalXp,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        level,
      })
      .eq('id', user.id)

    if (updateProfileError) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({
      action: 'undone',
      completionId: null,
      xpEarned: -existingCompletion.xp_earned,
      totalXp: stats.totalXp,
      currentStreak,
      longestStreak,
      level,
      weekDelta: -1,
    })
  }

  const multiplier = getStreakMultiplier(profile.current_streak)
  const xpEarned = Math.round(habit.xp_value * multiplier)

  const { data: insertedCompletion, error: insertError } = await supabase
    .from('habit_completions')
    .insert({
      user_id: user.id,
      habit_id: habit.id,
      completed_date: today,
      xp_earned: xpEarned,
      streak_multiplier: multiplier,
    })
    .select('id')
    .single()

  if (insertError || !insertedCompletion) {
    return NextResponse.json({ error: 'Failed to create completion' }, { status: 500 })
  }

  const stats = await getProfileStats(supabase, user.id)

  if (!stats) {
    return NextResponse.json({ error: 'Failed to recalculate streak' }, { status: 500 })
  }

  const currentStreak = stats.currentStreak
  const longestStreak = Math.max(profile.longest_streak, currentStreak)
  const level = calculateLevel(stats.totalXp)

  const { error: updateProfileError } = await supabase
    .from('profiles')
    .update({
      total_xp: stats.totalXp,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      level,
      last_active_date: today,
    })
    .eq('id', user.id)

  if (updateProfileError) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }

  return NextResponse.json({
    action: 'completed',
    completionId: insertedCompletion.id,
    xpEarned,
    totalXp: stats.totalXp,
    currentStreak,
    longestStreak,
    level,
    weekDelta: 1,
  })
}
