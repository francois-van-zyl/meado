'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, Reward } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type UnlockCondition = {
  type:  'streak' | 'seeds'
  value: number
} | null

type RewardWithProgress = Reward & {
  progress:  number   // 0–1
  isReady:   boolean
  condition: UnlockCondition
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProgress(condition: UnlockCondition, profile: Profile): number {
  if (!condition) return 1
  if (condition.type === 'streak') return Math.min(profile.current_streak / condition.value, 1)
  if (condition.type === 'seeds')  return Math.min(profile.total_xp / condition.value, 1)
  return 1
}

function isReady(condition: UnlockCondition, profile: Profile): boolean {
  if (!condition) return true
  if (condition.type === 'streak') return profile.current_streak >= condition.value
  if (condition.type === 'seeds')  return profile.total_xp >= condition.value
  return true
}

function conditionLabel(condition: UnlockCondition): string {
  if (!condition) return 'Claim anytime'
  if (condition.type === 'streak') return `${condition.value}-day streak`
  if (condition.type === 'seeds')  return `${condition.value.toLocaleString()} seeds`
  return 'Custom reward'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RewardsPage() {
  const [profile, setProfile]     = useState<Profile | null>(null)
  const [rewards, setRewards]     = useState<RewardWithProgress[]>([])
  const [loading, setLoading]     = useState(true)
  const [claiming, setClaiming]   = useState<string | null>(null)
  const [claimed, setClaimed]     = useState<string | null>(null)   // just-claimed id for celebration

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [profileRes, rewardsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('rewards').select('*').eq('user_id', user.id).order('created_at'),
    ])

    if (!profileRes.data) { setLoading(false); return }

    const prof = profileRes.data as Profile

    const mapped: RewardWithProgress[] = (rewardsRes.data ?? []).map((r: Reward) => {
      const condition = r.unlock_condition as UnlockCondition
      return {
        ...r,
        condition,
        progress: getProgress(condition, prof),
        isReady:  isReady(condition, prof),
      }
    })

    setProfile(prof)
    setRewards(mapped)
    setLoading(false)
  }

  async function claimReward(reward: RewardWithProgress) {
    if (claiming) return
    setClaiming(reward.id)

    const supabase = createClient()
    await supabase
      .from('rewards')
      .update({ is_redeemed: true, redeemed_at: new Date().toISOString() })
      .eq('id', reward.id)

    setRewards(prev => prev.map(r =>
      r.id === reward.id
        ? { ...r, is_redeemed: true, redeemed_at: new Date().toISOString() }
        : r
    ))
    setClaimed(reward.id)
    setTimeout(() => setClaimed(null), 3000)
    setClaiming(null)
  }

  // ── Sections ──────────────────────────────────────────────────────────────────

  const blooming   = rewards.filter(r => !r.is_redeemed && !r.isReady)
  const readyClaim = rewards.filter(r => !r.is_redeemed && r.isReady)
  const claimedAll = rewards.filter(r => r.is_redeemed)

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-44 bg-card rounded-lg" />
        <div className="h-4 w-52 bg-card rounded" />
        {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card rounded-2xl" />)}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* ── Header ── */}
      <div>
        <h1 className="font-lora text-3xl text-foreground leading-tight">Your rewards</h1>
        <p className="font-nunito text-sm text-muted mt-1">What you're tending toward.</p>
      </div>

      {rewards.length === 0 && (
        <div className="bg-card border border-border rounded-2xl px-5 py-10 text-center">
          <p className="font-nunito text-sm text-muted">
            No rewards set up yet.
          </p>
        </div>
      )}

      {/* ── Section: Ready to claim ── */}
      {readyClaim.length > 0 && (
        <section>
          <h2 className="font-lora text-lg text-foreground mb-3">Ready to claim</h2>
          <div className="space-y-3">
            {readyClaim.map(reward => (
              <div
                key={reward.id}
                className="bg-card border border-primary/40 rounded-2xl px-5 py-4"
              >
                {claimed === reward.id && (
                  <div className="mb-3 bg-primary/10 border border-primary/30 rounded-xl px-4 py-2.5 text-center">
                    <p className="font-nunito text-sm font-semibold text-primary">
                      🌸 Claimed — enjoy every moment of it.
                    </p>
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-lora font-semibold text-foreground text-base leading-tight">
                      {reward.name}
                    </p>
                    {reward.description && (
                      <p className="font-nunito text-xs text-muted mt-0.5">{reward.description}</p>
                    )}
                    <p className="font-nunito text-xs text-primary font-semibold mt-1">
                      ✓ {conditionLabel(reward.condition)}
                    </p>
                  </div>

                  <button
                    onClick={() => claimReward(reward)}
                    disabled={!!claiming}
                    className="flex-shrink-0 bg-primary text-white font-nunito text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60"
                  >
                    {claiming === reward.id ? 'Claiming…' : 'Claim reward'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section: Blooming ── */}
      {blooming.length > 0 && (
        <section>
          <h2 className="font-lora text-lg text-foreground mb-3">Blooming</h2>
          <div className="space-y-3">
            {blooming.map(reward => {
              const pct = Math.round(reward.progress * 100)
              return (
                <div key={reward.id} className="bg-card border border-border rounded-2xl px-5 py-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-lora font-semibold text-foreground text-base leading-tight">
                        {reward.name}
                      </p>
                      {reward.description && (
                        <p className="font-nunito text-xs text-muted mt-0.5">{reward.description}</p>
                      )}
                      <p className="font-nunito text-xs text-muted mt-1">
                        {conditionLabel(reward.condition)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 font-nunito text-xs text-muted bg-background border border-border px-2.5 py-1 rounded-full">
                      Not yet bloomed
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="font-nunito text-xs text-muted">Progress</span>
                    <span className="font-nunito text-xs font-semibold text-primary">{pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ── Section: Claimed ── */}
      {claimedAll.length > 0 && (
        <section>
          <h2 className="font-lora text-lg text-foreground mb-3">Claimed</h2>
          <div className="space-y-3">
            {claimedAll.map(reward => (
              <div key={reward.id} className="bg-card border border-border rounded-2xl px-5 py-4 opacity-70">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-lora font-semibold text-foreground text-base leading-tight">
                      {reward.name}
                    </p>
                    {reward.description && (
                      <p className="font-nunito text-xs text-muted mt-0.5">{reward.description}</p>
                    )}
                    {reward.redeemed_at && (
                      <p className="font-nunito text-xs text-muted mt-1">
                        {formatDate(reward.redeemed_at)}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-nunito text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                    Enjoyed 🌿
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
