'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getLastNDays, getTodayString, toLocalDateString } from '@/lib/dates'
import type { Profile, BossBattle } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type DayData = {
  date:   string
  label:  string
  count:  number
  isToday: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BOSS_NAMES = [
  'The Wandering Fog',
  'The Heavy Rain',
  'The Overgrown Path',
  'The Grey Tide',
  'The Sleepy Hollow',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getBossName(weekStart: string): string {
  const seed = Math.floor(new Date(weekStart + 'T00:00:00').getTime() / (7 * 24 * 60 * 60 * 1000))
  return BOSS_NAMES[seed % BOSS_NAMES.length]
}

function getISOWeek(dateStr: string): number {
  const d   = new Date(dateStr + 'T00:00:00')
  const day = d.getDay() || 7
  d.setDate(d.getDate() + 4 - day)
  const jan1 = new Date(d.getFullYear(), 0, 1)
  return Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + 1) / 7)
}

function formatWeekRange(days: DayData[]): string {
  if (days.length < 7) return ''
  const fmt = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00')
    const wd  = d.toLocaleDateString('en-GB', { weekday: 'short' })
    const day = d.getDate()
    const mon = d.toLocaleDateString('en-GB', { month: 'short' })
    return `${wd} ${day} ${mon}`
  }
  return `${fmt(days[0].date)} — ${fmt(days[6].date)}`
}

function getLast7Days(): DayData[] {
  const today = getTodayString()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const date = toLocalDateString(d)
    return {
      date,
      label:   d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 3),
      count:   0,
      isToday: date === today,
    }
  })
}

function getLast28Days(): string[] {
  return getLastNDays(28)
}

function formatBattleWeek(weekStart: string): string {
  const d = new Date(weekStart + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LogPage() {
  const [profile, setProfile]               = useState<Profile | null>(null)
  const [totalCompleted, setTotalCompleted] = useState(0)
  const [weeklyDays, setWeeklyDays]         = useState<DayData[]>([])
  const [last28, setLast28]                 = useState<Set<string>>(new Set())
  const [bossBattles, setBossBattles]       = useState<BossBattle[]>([])
  const [loading, setLoading]               = useState(true)

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const since28 = getLast28Days()[0]

        const [profileRes, countRes, completionsRes, battlesRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase
            .from('habit_completions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('habit_completions')
            .select('completed_date')
            .eq('user_id', user.id)
            .gte('completed_date', since28),
          supabase
            .from('boss_battles')
            .select('*')
            .eq('user_id', user.id)
            .order('week_start', { ascending: false }),
        ])

        if (profileRes.data) setProfile(profileRes.data)
        setTotalCompleted(countRes.count ?? 0)

        if (completionsRes.data) {
          // Build counts per day for last 7 days
          const countByDate: Record<string, number> = {}
          for (const row of completionsRes.data) {
            countByDate[row.completed_date] = (countByDate[row.completed_date] ?? 0) + 1
          }

          const days = getLast7Days().map(d => ({ ...d, count: countByDate[d.date] ?? 0 }))
          setWeeklyDays(days)

          // Build set of dates with any completion for last 28 days
          const datesWithCompletion = new Set(
            completionsRes.data.map((r: { completed_date: string }) => r.completed_date)
          )
          setLast28(datesWithCompletion)
        }

        if (battlesRes.data) setBossBattles(battlesRes.data)

        setLoading(false)
      })()
    })
  }, [])

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-card rounded-lg" />
        <div className="h-4 w-52 bg-card rounded" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-card rounded-2xl" />)}
        </div>
        <div className="h-40 bg-card rounded-2xl" />
        <div className="h-32 bg-card rounded-2xl" />
        <div className="h-32 bg-card rounded-2xl" />
      </div>
    )
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const streak        = profile?.current_streak ?? 0
  const longestStreak = profile?.longest_streak ?? 0
  const totalXp       = profile?.total_xp ?? 0
  const maxBarCount   = Math.max(...weeklyDays.map(d => d.count), 1)
  const weekRange     = formatWeekRange(weeklyDays)
  const days28        = getLast28Days()

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="font-lora text-3xl text-foreground leading-tight">Garden log</h1>
        <p className="font-nunito text-sm text-muted mt-1">Your story, one day at a time.</p>
      </div>

      {/* ── 1. Summary cards ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Current streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} icon="☀️" />
        <StatCard label="Longest streak" value={`${longestStreak} ${longestStreak === 1 ? 'day' : 'days'}`} icon="🏆" />
        <StatCard label="Seeds earned"   value={totalXp.toLocaleString()} icon="🌱" />
        <StatCard label="Habits done"    value={totalCompleted.toLocaleString()} icon="✓" />
      </div>

      {/* ── 2. Weekly completion chart ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-lora font-semibold text-foreground text-base">Last 7 days</h2>
          <span className="font-nunito text-xs text-muted">{weekRange}</span>
        </div>

        <div className="flex items-end gap-2 h-28">
          {weeklyDays.map(day => {
            const heightPct = maxBarCount > 0 ? (day.count / maxBarCount) * 100 : 0
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="font-nunito text-[10px] text-muted">{day.count > 0 ? day.count : ''}</span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height:          `${Math.max(heightPct, day.count > 0 ? 8 : 0)}%`,
                      minHeight:       day.count > 0 ? '4px' : '0',
                      backgroundColor: day.isToday ? '#5A7E5E' : '#7A9E7E',
                      opacity:         day.count === 0 ? 0 : 1,
                    }}
                  />
                </div>
                <span
                  className="font-nunito text-[10px]"
                  style={{ color: day.isToday ? '#7A9E7E' : '#8C6D50', fontWeight: day.isToday ? 700 : 400 }}
                >
                  {day.label}
                </span>
              </div>
            )
          })}
        </div>

        {weeklyDays.every(d => d.count === 0) && (
          <p className="font-nunito text-xs text-muted text-center mt-2">
            No completions yet this week.
          </p>
        )}
      </div>

      {/* ── 3. Streak history ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-5">
        <h2 className="font-lora font-semibold text-foreground text-base mb-4">Streak history</h2>

        <div className="flex items-center gap-4 mb-5">
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
            <p className="font-nunito text-xs text-muted mt-0.5">
              Best: {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </p>
          </div>
        </div>

        {/* 28-day circles — 4 rows of 7 */}
        <div className="space-y-2">
          {[0, 1, 2, 3].map(week => (
            <div key={week} className="flex items-center gap-2">
              {days28.slice(week * 7, week * 7 + 7).map(date => {
                const hasDone = last28.has(date)
                const isToday = date === getTodayString()
                return (
                  <div
                    key={date}
                    title={date}
                    className="w-7 h-7 rounded-full flex-shrink-0 transition-all"
                    style={
                      hasDone
                        ? { backgroundColor: isToday ? '#5A7E5E' : '#7A9E7E' }
                        : { border: '2px solid #D6CBAF' }
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
        <p className="font-nunito text-xs text-muted mt-3">Last 28 days — filled = at least one habit done</p>
      </div>

      {/* ── 4. Boss battle record ── */}
      <div className="bg-card border border-border rounded-2xl px-5 py-5">
        <h2 className="font-lora font-semibold text-foreground text-base mb-4">Boss battle record</h2>

        {bossBattles.length === 0 ? (
          <p className="font-nunito text-sm text-muted">Your first battle is underway 🌿</p>
        ) : (
          <div className="divide-y divide-border">
            {bossBattles.map(battle => (
              <div key={battle.id} className="py-3 flex items-center gap-3">
                {/* Result icon */}
                <div className="flex-shrink-0 text-lg">
                  {battle.is_won ? '🏆' : '☁️'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-lora font-semibold text-sm leading-tight"
                    style={{ color: battle.is_won ? '#7A9E7E' : '#8C6D50' }}
                  >
                    {getBossName(battle.week_start)}
                  </p>
                  <p className="font-nunito text-xs text-muted mt-0.5">
                    Week {getISOWeek(battle.week_start)} · {formatBattleWeek(battle.week_start)}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex-shrink-0 text-right">
                  <p className="font-nunito text-xs font-semibold text-foreground">
                    {battle.actual_completion_pct != null
                      ? `${Math.round(Number(battle.actual_completion_pct))}%`
                      : '—'}
                    {' '}/ {battle.target_completion_pct}%
                  </p>
                  <p
                    className="font-nunito text-[10px] font-semibold"
                    style={{ color: battle.is_won ? '#7A9E7E' : '#8C6D50' }}
                  >
                    {battle.is_won ? 'Calm restored' : 'Fog remained'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-4 flex items-center gap-3">
      <span className="text-2xl flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-lora font-bold text-foreground text-lg leading-tight truncate">{value}</p>
        <p className="font-nunito text-xs text-muted mt-0.5">{label}</p>
      </div>
    </div>
  )
}
