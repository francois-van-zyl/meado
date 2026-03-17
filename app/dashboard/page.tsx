'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { calculateLevel, getStreakMultiplier, getStreakMultiplierLabel } from '@/lib/xp'
import { calculateStreak } from '@/lib/streaks'
import type { Profile, BossBattle } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type HabitRow = {
  id:            string
  name:          string
  category:      string
  icon:          string
  xp_value:      number
  completed:     boolean
  completionId?: string   // set once the row has been completed today
  completionXp?: number   // xp_earned at time of completion (for accurate reversal)
}

type XpAnimation = {
  id:      number
  habitId: string   // prefixed with 'y-' for yesterday rows
  xp:      number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOSS_NAMES = [
  'The Wandering Fog',
  'The Heavy Rain',
  'The Overgrown Path',
  'The Grey Tide',
  'The Sleepy Hollow',
]

const CATEGORY_COLOR: Record<string, string> = {
  health:        '#7A9E7E',
  fitness:       '#D4858A',
  finance:       '#E8A840',
  mental_health: '#A89BC4',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

function getYesterdayString() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().split('T')[0]
}

function formatYesterday(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toLocaleDateString('en-ZA', { weekday: 'long', month: 'long', day: 'numeric' })
}

function getWeekBounds() {
  const today = new Date()
  const dow   = today.getDay()
  const mondayOffset = dow === 0 ? -6 : 1 - dow
  const monday = new Date(today)
  monday.setDate(today.getDate() + mondayOffset)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return {
    monday:      monday.toISOString().split('T')[0],
    sunday:      sunday.toISOString().split('T')[0],
    daysElapsed: dow === 0 ? 7 : dow,
  }
}

function getISOWeek(dateStr: string): number {
  const d   = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + 1) / 7)
}

function getBossName(weekStart: string): string {
  const seed = Math.floor(new Date(weekStart + 'T00:00:00').getTime() / (7 * 24 * 60 * 60 * 1000))
  return BOSS_NAMES[seed % BOSS_NAMES.length]
}

function getGreeting(name: string | null): string {
  const h    = new Date().getHours()
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${time}, ${name}` : time
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-ZA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function getLevelBounds(totalXp: number) {
  const level    = calculateLevel(totalXp)
  const start    = (level - 1) * (level - 1) * 100
  const end      = level * level * 100
  const progress = Math.round(((totalXp - start) / (end - start)) * 100)
  return { level, end, progress }
}

// ─── Habit row shared renderer ────────────────────────────────────────────────

function HabitListRow({
  habit,
  onComplete,
  animKey,
  animations,
  toggleable = false,
}: {
  habit:       HabitRow
  onComplete:  (h: HabitRow) => void
  animKey:     string
  animations:  XpAnimation[]
  /** When true, completed rows are also clickable (today's toggle behaviour). */
  toggleable?: boolean
}) {
  const color     = CATEGORY_COLOR[habit.category] ?? '#7A9E7E'
  const anim      = animations.find(a => a.habitId === animKey)
  const clickable = toggleable || !habit.completed

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => { if (clickable) onComplete(habit) }}
      onKeyDown={e => { if (clickable && (e.key === 'Enter' || e.key === ' ')) onComplete(habit) }}
      className={`relative flex items-center gap-3 pl-0 pr-4 py-3.5 select-none transition-colors ${
        clickable
          ? 'cursor-pointer hover:bg-background/60 active:bg-background'
          : 'cursor-default opacity-70'
      }`}
    >
      {/* Category accent bar */}
      <div className="self-stretch w-1 flex-shrink-0 rounded-r" style={{ backgroundColor: color }} />

      {/* Completion dot */}
      <div
        className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center transition-all duration-300"
        style={
          habit.completed
            ? { backgroundColor: color }
            : { border: `2px solid ${color}`, backgroundColor: 'transparent' }
        }
      >
        {habit.completed && (
          <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Habit name */}
      <div className="flex-1 min-w-0">
        <span className={`font-nunito text-sm ${habit.completed ? 'line-through text-muted' : 'text-foreground'}`}>
          {habit.icon} {habit.name}
        </span>
      </div>

      {/* XP badge */}
      <span className="font-nunito text-xs font-semibold flex-shrink-0 text-muted">
        +{habit.xp_value}
      </span>

      {/* Floating XP animation */}
      {anim && (
        <div className="xp-float absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span
            className="font-nunito font-bold text-sm px-3 py-1 rounded-full shadow-sm"
            style={{ backgroundColor: color, color: '#fff' }}
          >
            +{anim.xp} seeds
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [loading, setLoading]                     = useState(true)
  const [profile, setProfile]                     = useState<Profile | null>(null)
  const [habits, setHabits]                       = useState<HabitRow[]>([])
  const [yesterdayHabits, setYesterdayHabits]     = useState<HabitRow[]>([])
  const [yesterdayExpanded, setYesterdayExpanded] = useState(false)
  const [bossBattle, setBossBattle]               = useState<BossBattle | null>(null)
  const [weekCount, setWeekCount]                 = useState(0)
  const [animations, setAnimations]               = useState<XpAnimation[]>([])

  useEffect(() => { loadDashboard() }, [])

  // ── Data loading ─────────────────────────────────────────────────────────────

  async function loadDashboard() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today     = getTodayString()
    const yesterday = getYesterdayString()
    const { monday, sunday } = getWeekBounds()

    const [profileRes, habitsRes, bossRes, weekRes, yesterdayRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single(),
      supabase
        .from('habits')
        .select('id, name, category, icon, xp_value, habit_completions(id, completed_date, xp_earned)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('boss_battles')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', monday)
        .maybeSingle(),
      supabase
        .from('habit_completions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('completed_date', monday)
        .lte('completed_date', today),
      supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('user_id', user.id)
        .eq('completed_date', yesterday),
    ])

    if (profileRes.data) setProfile(profileRes.data)

    if (habitsRes.data) {
      type RawHabit = {
        id: string; name: string; category: string; icon: string; xp_value: number
        habit_completions: { id: string; completed_date: string; xp_earned: number }[]
      }
      const completedYesterdayIds = new Set(yesterdayRes.data?.map(c => c.habit_id) ?? [])

      const mapped = (habitsRes.data as RawHabit[]).map(h => {
        const todayCompletion = h.habit_completions?.find(c => c.completed_date === today)
        return {
          id:            h.id,
          name:          h.name,
          category:      h.category,
          icon:          h.icon,
          xp_value:      h.xp_value,
          completed:     !!todayCompletion,
          completionId:  todayCompletion?.id,
          completionXp:  todayCompletion?.xp_earned,
        }
      })
      setHabits(mapped)

      setYesterdayHabits(
        (habitsRes.data as RawHabit[]).map(h => ({
          id:        h.id,
          name:      h.name,
          category:  h.category,
          icon:      h.icon,
          xp_value:  h.xp_value,
          completed: completedYesterdayIds.has(h.id),
        }))
      )
    }

    setWeekCount(weekRes.count ?? 0)

    if (bossRes.data) {
      setBossBattle(bossRes.data)
    } else {
      const { data: newBoss } = await supabase
        .from('boss_battles')
        .insert({ user_id: user.id, week_start: monday, week_end: sunday, target_completion_pct: 80 })
        .select()
        .single()
      if (newBoss) setBossBattle(newBoss)
    }

    setLoading(false)
  }

  // ── Streak refresh (called after every completion / reversal) ───────────────

  async function refreshStreak(userId: string) {
    const supabase = createClient()

    // Use local time so the date matches how completions are stored
    const since = new Date()
    since.setDate(since.getDate() - 90)
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`

    const { data } = await supabase
      .from('habit_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', sinceStr)

    if (!data) return

    const dates = data.map((c: { completed_date: string }) => c.completed_date)
    const newStreak = calculateStreak(dates)

    // Update UI state first
    let newLongest = newStreak
    setProfile(prev => {
      if (!prev) return prev
      newLongest = Math.max(prev.longest_streak, newStreak)
      return { ...prev, current_streak: newStreak, longest_streak: newLongest }
    })

    // Write to Supabase separately — not inside the setter
    await supabase
      .from('profiles')
      .update({ current_streak: newStreak, longest_streak: newLongest })
      .eq('id', userId)
  }

  // ── Today: toggle complete / incomplete ──────────────────────────────────────

  async function toggleHabit(habit: HabitRow) {
    if (!profile) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (habit.completed && habit.completionId) {
      // ── Reverse completion ──
      const xpToRemove = habit.completionXp ?? habit.xp_value
      const restoredXp = profile.total_xp - xpToRemove

      setHabits(prev => prev.map(h =>
        h.id === habit.id
          ? { ...h, completed: false, completionId: undefined, completionXp: undefined }
          : h
      ))
      setProfile(prev => prev ? { ...prev, total_xp: prev.total_xp - xpToRemove } : prev)
      setWeekCount(prev => Math.max(0, prev - 1))

      await Promise.all([
        supabase.from('habit_completions').delete().eq('id', habit.completionId),
        supabase.from('profiles').update({ total_xp: restoredXp }).eq('id', user.id),
      ])
      await refreshStreak(user.id)
    } else if (!habit.completed) {
      // ── Mark complete ──
      const multiplier = getStreakMultiplier(profile.current_streak)
      const xpEarned   = Math.round(habit.xp_value * multiplier)
      const newTotalXp = profile.total_xp + xpEarned

      setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, completed: true } : h))
      setProfile(prev => prev ? { ...prev, total_xp: prev.total_xp + xpEarned } : prev)
      setWeekCount(prev => prev + 1)

      const animId = Date.now()
      setAnimations(prev => [...prev, { id: animId, habitId: habit.id, xp: xpEarned }])
      setTimeout(() => setAnimations(prev => prev.filter(a => a.id !== animId)), 1200)

      const [completionRes] = await Promise.all([
        supabase
          .from('habit_completions')
          .insert({
            habit_id:          habit.id,
            user_id:           user.id,
            completed_date:    getTodayString(),
            xp_earned:         xpEarned,
            streak_multiplier: multiplier,
          })
          .select('id')
          .single(),
        supabase.from('profiles').update({ total_xp: newTotalXp }).eq('id', user.id),
      ])

      if (completionRes.error || !completionRes.data) {
        // Revert on DB failure
        setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, completed: false } : h))
        setProfile(prev => prev ? { ...prev, total_xp: prev.total_xp - xpEarned } : prev)
        setWeekCount(prev => Math.max(0, prev - 1))
        return
      }

      // Store completion ID so the row can be toggled back off
      setHabits(prev => prev.map(h =>
        h.id === habit.id
          ? { ...h, completionId: completionRes.data.id, completionXp: xpEarned }
          : h
      ))

      await refreshStreak(user.id)
    }
  }

  // ── Yesterday: backfill (no undo) ────────────────────────────────────────────

  async function completeYesterdayHabit(habit: HabitRow) {
    if (habit.completed || !profile) return

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const multiplier = getStreakMultiplier(profile.current_streak)
    const xpEarned   = Math.round(habit.xp_value * multiplier)
    const newTotalXp = profile.total_xp + xpEarned
    const yesterday  = getYesterdayString()

    // Optimistic UI
    setYesterdayHabits(prev => prev.map(h => h.id === habit.id ? { ...h, completed: true } : h))
    setProfile(prev => prev ? { ...prev, total_xp: newTotalXp } : prev)

    // Count toward boss battle only if yesterday is within the current week
    const { monday } = getWeekBounds()
    if (yesterday >= monday) setWeekCount(prev => prev + 1)

    // XP animation (prefixed key so it targets the yesterday row)
    const animId = Date.now()
    setAnimations(prev => [...prev, { id: animId, habitId: `y-${habit.id}`, xp: xpEarned }])
    setTimeout(() => setAnimations(prev => prev.filter(a => a.id !== animId)), 1200)

    // DB write — fire and forget, no undo
    await Promise.all([
      supabase.from('habit_completions').insert({
        habit_id:          habit.id,
        user_id:           user.id,
        completed_date:    yesterday,
        xp_earned:         xpEarned,
        streak_multiplier: multiplier,
      }),
      supabase.from('profiles').update({ total_xp: newTotalXp }).eq('id', user.id),
    ])

    await refreshStreak(user.id)
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const totalXp    = profile?.total_xp ?? 0
  const streak     = profile?.current_streak ?? 0
  const { level, end: levelEnd, progress: xpProgress } = getLevelBounds(totalXp)
  const multiplierLabel  = getStreakMultiplierLabel(streak)
  const allComplete      = habits.length > 0 && habits.every(h => h.completed)
  const allYesterdayDone = yesterdayHabits.length > 0 && yesterdayHabits.every(h => h.completed)

  const { daysElapsed }  = getWeekBounds()
  const totalPossible    = habits.length * daysElapsed
  const bossProgress     = totalPossible > 0 ? Math.min(Math.round((weekCount / totalPossible) * 100), 100) : 0
  const bossTarget       = bossBattle?.target_completion_pct ?? 80
  const targetCount      = Math.ceil((bossTarget / 100) * totalPossible)
  const remainingForBoss = Math.max(0, targetCount - weekCount)

  // ── Skeleton ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-card rounded-lg" />
        <div className="h-4 w-32 bg-card rounded" />
        <div className="h-24 bg-card rounded-2xl" />
        <div className="h-16 bg-card rounded-2xl" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-card rounded-xl" />)}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── All tended banner ── */}
      {allComplete && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <span className="text-xl">🌿</span>
          <p className="font-nunito text-sm font-semibold text-primary">
            All tended — your meadow is at peace today.
          </p>
        </div>
      )}

      {/* ── 1. Header ── */}
      <div>
        <h1 className="font-lora text-3xl text-foreground leading-tight">
          {getGreeting(profile?.display_name ?? null)}
        </h1>
        <p className="font-nunito text-sm text-muted mt-1">{formatDate()}</p>
      </div>

      {/* ── 2. Seeds & Level bar ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 bg-primary/15 text-primary font-nunito font-semibold text-xs px-3 py-1 rounded-full">
            🌱 Caretaker Lvl {level}
          </span>
          {multiplierLabel && (
            <span className="font-nunito text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full">
              {multiplierLabel}
            </span>
          )}
        </div>
        <div className="w-full bg-border rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full bg-primary transition-all duration-700"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="font-nunito text-xs text-muted">Bloom</span>
          <span className="font-nunito text-xs text-muted">
            {totalXp.toLocaleString()} / {levelEnd.toLocaleString()} seeds
          </span>
        </div>
      </div>

      {/* ── 3. Streak ── */}
      <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
          style={{ backgroundColor: '#E8A84022', border: '2px solid #E8A840' }}
        >
          ☀️
        </div>
        <div>
          <p className="font-nunito font-bold text-foreground text-base leading-tight">
            {streak} sunny {streak === 1 ? 'day' : 'days'}
          </p>
          {multiplierLabel ? (
            <p className="font-nunito text-xs text-muted mt-0.5">
              Streak bonus active — earning <span className="text-accent font-semibold">{multiplierLabel}</span>
            </p>
          ) : (
            <p className="font-nunito text-xs text-muted mt-0.5">
              Reach 3 days in a row to earn a seed bonus
            </p>
          )}
        </div>
      </div>

      {/* ── 4. Today's tending ── */}
      <div>
        <h2 className="font-lora italic text-muted text-base mb-3 px-1">
          Today's tending
        </h2>

        {habits.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl px-5 py-8 text-center">
            <p className="font-nunito text-sm text-muted">
              No habits yet.{' '}
              <a href="/dashboard/habits" className="text-primary underline underline-offset-2">
                Add some habits
              </a>{' '}
              to begin tending.
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {habits.map(habit => (
              <HabitListRow
                key={habit.id}
                habit={habit}
                onComplete={toggleHabit}
                animKey={habit.id}
                animations={animations}
                toggleable
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 5. Yesterday section ── */}
      {yesterdayHabits.length > 0 && (
        <div>
          {allYesterdayDone ? (
            /* All done — subtle confirmation, no expand */
            <div className="flex items-center gap-2 px-1">
              <span className="font-lora italic text-sm" style={{ color: '#B0A090' }}>
                Yesterday
              </span>
              <span className="font-nunito text-xs text-primary font-semibold">✓</span>
              <span className="font-nunito text-xs text-muted">all tended</span>
            </div>
          ) : (
            <>
              {/* Collapsible header */}
              <button
                onClick={() => setYesterdayExpanded(v => !v)}
                className="flex items-center gap-2 px-1 w-full text-left group"
              >
                <span className="font-lora italic text-sm" style={{ color: '#B0A090' }}>
                  Yesterday
                </span>
                <span className="font-nunito text-xs text-muted">{formatYesterday()}</span>
                <svg
                  className="w-3.5 h-3.5 text-muted ml-auto transition-transform duration-200"
                  style={{ transform: yesterdayExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  viewBox="0 0 20 20" fill="currentColor"
                >
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {yesterdayExpanded && (
                <div className="mt-2 bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border opacity-90">
                  {yesterdayHabits.map(habit => (
                    <HabitListRow
                      key={habit.id}
                      habit={habit}
                      onComplete={completeYesterdayHabit}
                      animKey={`y-${habit.id}`}
                      animations={animations}
                      // No undo for backfilled completions
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── 6. Boss battle card ── */}
      {bossBattle && (
        <div className="bg-card border border-border rounded-2xl px-5 py-5">
          <div className="flex items-start justify-between mb-1">
            <h2 className="font-lora font-bold text-foreground text-xl leading-tight">
              {getBossName(bossBattle.week_start)}
            </h2>
            <span className="font-nunito text-xs text-muted bg-background border border-border px-2.5 py-1 rounded-full flex-shrink-0 ml-3 mt-0.5">
              Week {getISOWeek(bossBattle.week_start)}
            </span>
          </div>
          <p className="font-nunito text-xs text-muted italic mb-4">
            It crept in on Monday…
          </p>

          <div className="relative w-full h-3 bg-border rounded-full overflow-visible mb-3">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${bossProgress}%`, backgroundColor: '#D4858A' }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-5 rounded-full"
              style={{ left: `${bossTarget}%`, backgroundColor: '#3D2B1A', opacity: 0.35 }}
            />
            <div
              className="absolute -top-5 -translate-x-1/2 font-nunito text-[10px] text-muted"
              style={{ left: `${bossTarget}%` }}
            >
              {bossTarget}%
            </div>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-center">
              <p className="font-lora text-xl font-bold" style={{ color: '#D4858A' }}>
                {bossProgress}%
              </p>
              <p className="font-nunito text-xs text-muted mt-0.5">restored</p>
            </div>
            <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-center">
              <p className="font-lora text-xl font-bold text-foreground">{remainingForBoss}</p>
              <p className="font-nunito text-xs text-muted mt-0.5">more to lift the fog</p>
            </div>
          </div>

          {bossProgress >= bossTarget && (
            <div className="mt-4 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 text-center">
              <p className="font-nunito text-sm font-semibold text-primary">
                🌿 Calm restored — you lifted the fog this week.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
