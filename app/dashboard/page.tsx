/**
 * app/dashboard/page.tsx
 *
 * The main Meado dashboard — the meadow view. Renders today's habits,
 * the Seeds/Bloom XP bar, the streak counter, and the weekly boss
 * battle card.
 *
 * Habits are toggleable: tap to complete, tap again to undo. All date
 * calculations use local time (not toISOString/UTC) to avoid date-shift
 * bugs in non-UTC timezones.
 */
'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getTodayString, getWeekBounds } from '@/lib/dates'
import { calculateLevel, getStreakMultiplier, getStreakMultiplierLabel } from '@/lib/xp'
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
  habitId: string
  xp:      number
}

type TodayToggleResponse = {
  action: 'completed' | 'undone'
  completionId: string | null
  xpEarned: number
  totalXp: number
  currentStreak: number
  longestStreak: number
  level: number
  weekDelta: number
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
  const [bossBattle, setBossBattle]               = useState<BossBattle | null>(null)
  const [weekCount, setWeekCount]                 = useState(0)
  const [animations, setAnimations]               = useState<XpAnimation[]>([])
  const pendingHabitIdsRef                        = useRef<Set<string>>(new Set())
  const refreshTimeoutRef                         = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function loadDashboardData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today     = getTodayString()
    const { monday, sunday } = getWeekBounds()

    const [profileRes, habitsRes, bossRes, weekRes] = await Promise.all([
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
    ])

    if (profileRes.data) setProfile(profileRes.data)

    if (habitsRes.data) {
      type RawHabit = {
        id: string; name: string; category: string; icon: string; xp_value: number
        habit_completions: { id: string; completed_date: string; xp_earned: number }[]
      }

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

  function scheduleDashboardRefresh() {
    if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    refreshTimeoutRef.current = setTimeout(() => {
      if (pendingHabitIdsRef.current.size > 0) {
        scheduleDashboardRefresh()
        return
      }
      void loadDashboardData()
    }, 200)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadDashboardData()
    })

    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [])

  // ── Today: toggle complete / incomplete ──────────────────────────────────────

  async function toggleHabit(habit: HabitRow) {
    if (!profile) return
    if (pendingHabitIdsRef.current.has(habit.id)) return
    pendingHabitIdsRef.current.add(habit.id)

    const isUndo = habit.completed && habit.completionId
    const xpDelta = isUndo
      ? -(habit.completionXp ?? habit.xp_value)
      : Math.round(habit.xp_value * getStreakMultiplier(profile.current_streak))

    setHabits(prev => prev.map(h =>
      h.id === habit.id
        ? {
            ...h,
            completed: !isUndo,
            completionId: isUndo ? undefined : h.completionId,
            completionXp: isUndo ? undefined : xpDelta,
          }
        : h
    ))
    setProfile(prev => prev ? { ...prev, total_xp: Math.max(0, prev.total_xp + xpDelta) } : prev)
    setWeekCount(prev => Math.max(0, prev + (isUndo ? -1 : 1)))

    if (!isUndo) {
      const animId = Date.now()
      setAnimations(prev => [...prev, { id: animId, habitId: habit.id, xp: xpDelta }])
      setTimeout(() => setAnimations(prev => prev.filter(a => a.id !== animId)), 1200)
    }

    try {
      const response = await fetch('/api/habits/today-toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ habitId: habit.id }),
      })

      if (!response.ok) {
        await loadDashboardData()
        return
      }

      const result = await response.json() as TodayToggleResponse

      setHabits(prev => prev.map(h =>
        h.id === habit.id
          ? {
              ...h,
              completed: result.action === 'completed',
              completionId: result.completionId ?? undefined,
              completionXp: result.action === 'completed' ? result.xpEarned : undefined,
            }
          : h
      ))
      scheduleDashboardRefresh()
    } finally {
      pendingHabitIdsRef.current.delete(habit.id)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────────

  const totalXp    = profile?.total_xp ?? 0
  const streak     = profile?.current_streak ?? 0
  const { level, end: levelEnd, progress: xpProgress } = getLevelBounds(totalXp)
  const multiplierLabel  = getStreakMultiplierLabel(streak)
  const allComplete      = habits.length > 0 && habits.every(h => h.completed)

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
          Today&apos;s tending
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

      {/* ── 5. Boss battle card ── */}
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
