/**
 * app/onboarding/page.tsx
 *
 * Eight-step onboarding wizard that runs once per user, immediately
 * after email confirmation. Collects display name, currency, habit
 * categories, specific habits, rewards, and boss battle target, then
 * writes everything to Supabase in a single commit on the final step.
 *
 * The presence of display_name in the profiles table is the signal
 * that onboarding is complete — proxy.ts uses this to gate access to
 * /dashboard. If display_name is null the user will always be
 * redirected back here. On the final step, existing habits and rewards
 * are deleted before re-inserting to prevent duplicates if the user
 * somehow runs onboarding twice.
 */
'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Habit = {
  name: string
  category: string
  xp: number
  icon: string
}

type WizardState = {
  name: string
  currency: string
  currencySymbol: string
  selectedCategories: string[]
  selectedHabits: Habit[]
  rewards: string[]
  bossTarget: number
}

// ─── Static data ──────────────────────────────────────────────────────────────

const CURRENCIES = [
  { code: 'ZAR', symbol: 'R',    label: 'ZAR' },
  { code: 'USD', symbol: '$',    label: 'USD' },
  { code: 'GBP', symbol: '£',    label: 'GBP' },
  { code: 'EUR', symbol: '€',    label: 'EUR' },
  { code: 'AUD', symbol: 'A$',   label: 'AUD' },
  { code: 'NZD', symbol: 'NZ$',  label: 'NZD' },
]

const CATEGORIES = [
  { id: 'health',       label: 'Health',        icon: '🌿', description: 'Sleep, water, nutrition, medication' },
  { id: 'fitness',      label: 'Fitness',       icon: '💪', description: 'Movement, exercise, steps, strength' },
  { id: 'finance',      label: 'Finance',       icon: '🌾', description: 'Budgeting, saving, spending awareness' },
  { id: 'mental_health',label: 'Mental Health', icon: '🌸', description: 'Journaling, meditation, quiet time' },
]

const HABIT_PRESETS: Record<string, Habit[]> = {
  health: [
    { name: 'Drink 2L water',       category: 'health',  xp: 15, icon: '💧' },
    { name: 'Eat a proper meal',    category: 'health',  xp: 15, icon: '🥗' },
    { name: 'Sleep before midnight',category: 'health',  xp: 10, icon: '😴' },
    { name: 'Take supplements',     category: 'health',  xp: 10, icon: '💊' },
    { name: 'No alcohol',           category: 'health',  xp: 20, icon: '🚫' },
  ],
  fitness: [
    { name: '30 min movement',  category: 'fitness', xp: 20, icon: '🏃' },
    { name: 'Strength session', category: 'fitness', xp: 25, icon: '💪' },
    { name: 'Stretch or yoga',  category: 'fitness', xp: 15, icon: '🧘' },
    { name: '10k steps',        category: 'fitness', xp: 20, icon: '🚶' },
    { name: 'Cardio session',   category: 'fitness', xp: 25, icon: '🏊' },
  ],
  finance: [
    { name: 'Log expenses',       category: 'finance', xp: 10, icon: '📝' },
    { name: 'No unplanned spend', category: 'finance', xp: 15, icon: '🚫' },
    { name: 'Add to savings',     category: 'finance', xp: 20, icon: '💰' },
    { name: 'Check budget',       category: 'finance', xp: 10, icon: '📊' },
    { name: 'Pack lunch',         category: 'finance', xp: 15, icon: '🍱' },
  ],
  mental_health: [
    { name: 'Journal entry',      category: 'mental_health', xp: 15, icon: '📔' },
    { name: 'Meditation',         category: 'mental_health', xp: 15, icon: '🧠' },
    { name: 'Screen-free hour',   category: 'mental_health', xp: 10, icon: '📵' },
    { name: 'Gratitude practice', category: 'mental_health', xp: 10, icon: '🙏' },
    { name: 'Read for 20 min',    category: 'mental_health', xp: 15, icon: '📚' },
  ],
}

type RewardPreset = {
  name: string
  description: string
  unlockCondition: Record<string, unknown>
  isSpendBased: boolean
}

const REWARD_PRESETS: RewardPreset[] = [
  { name: '🌙 Rest day',          description: 'Unlock at 7-day streak',  unlockCondition: { type: 'streak', value: 7 },    isSpendBased: false },
  { name: '🎬 Movie night',        description: 'Unlock at 500 seeds',     unlockCondition: { type: 'seeds',  value: 500 },  isSpendBased: true  },
  { name: '☕ Solo coffee date',   description: 'Unlock at 14-day streak', unlockCondition: { type: 'streak', value: 14 },   isSpendBased: false },
  { name: '🛁 Long bath evening',  description: 'Unlock at 21-day streak', unlockCondition: { type: 'streak', value: 21 },   isSpendBased: false },
  { name: '📖 New book',           description: 'Unlock at 1000 seeds',    unlockCondition: { type: 'seeds',  value: 1000 }, isSpendBased: true  },
  { name: '🌿 Nature walk',        description: 'Unlock at 3-day streak',  unlockCondition: { type: 'streak', value: 3 },    isSpendBased: false },
]

const BOSS_NAMES = [
  'The Wandering Fog',
  'The Heavy Rain',
  'The Overgrown Path',
  'The Grey Tide',
  'The Sleepy Hollow',
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [customReward, setCustomReward] = useState('')
  const [customCurrency, setCustomCurrency] = useState('')
  const [bossName] = useState(
    () => BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
  )

  const [wizard, setWizard] = useState<WizardState>({
    name: '',
    currency: 'ZAR',
    currencySymbol: 'R',
    selectedCategories: ['health', 'fitness', 'finance', 'mental_health'],
    selectedHabits: [],
    rewards: [],
    bossTarget: 80,
  })

  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (step === 2) nameInputRef.current?.focus()
  }, [step])

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function next() { setStep(s => s + 1) }
  function back() { setStep(s => s - 1) }

  function toggleCategory(id: string) {
    setWizard(w => {
      if (w.selectedCategories.includes(id)) {
        if (w.selectedCategories.length === 1) return w
        return { ...w, selectedCategories: w.selectedCategories.filter(c => c !== id) }
      }
      return { ...w, selectedCategories: [...w.selectedCategories, id] }
    })
  }

  function toggleHabit(habit: Habit) {
    setWizard(w => {
      const exists = w.selectedHabits.some(
        h => h.name === habit.name && h.category === habit.category
      )
      if (exists) {
        return { ...w, selectedHabits: w.selectedHabits.filter(
          h => !(h.name === habit.name && h.category === habit.category)
        )}
      }
      return { ...w, selectedHabits: [...w.selectedHabits, habit] }
    })
  }

  function toggleReward(name: string) {
    setWizard(w => {
      if (w.rewards.includes(name)) {
        return { ...w, rewards: w.rewards.filter(r => r !== name) }
      }
      return { ...w, rewards: [...w.rewards, name] }
    })
  }

  function removeReward(name: string) {
    setWizard(w => ({ ...w, rewards: w.rewards.filter(r => r !== name) }))
  }

  function addCustomReward() {
    const trimmed = customReward.trim()
    if (!trimmed || wizard.rewards.includes(trimmed)) return
    setWizard(w => ({ ...w, rewards: [...w.rewards, trimmed] }))
    setCustomReward('')
  }

  function selectCurrency(code: string, symbol: string) {
    setWizard(w => ({ ...w, currency: code, currencySymbol: symbol }))
    setCustomCurrency('')
  }

  function handleCustomCurrency(value: string) {
    setCustomCurrency(value)
    if (value.trim()) {
      setWizard(w => ({ ...w, currency: value.trim(), currencySymbol: value.trim() }))
    }
  }

  async function handleSubmit() {
    setLoading(true)
    setSubmitError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setSubmitError('Session expired. Please sign in again.')
      setLoading(false)
      return
    }

    // 1. Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        display_name: wizard.name,
        currency: wizard.currency,
        timezone: 'Africa/Johannesburg',
      })
      .eq('id', user.id)

    if (profileError) {
      setSubmitError(profileError.message)
      setLoading(false)
      return
    }

    // 2. Clear existing habits and rewards, then re-insert
    await supabase.from('habits').delete().eq('user_id', user.id)
    await supabase.from('rewards').delete().eq('user_id', user.id)

    // 3. Insert habits
    if (wizard.selectedHabits.length > 0) {
      const { error: habitsError } = await supabase
        .from('habits')
        .insert(
          wizard.selectedHabits.map((h, i) => ({
            user_id: user.id,
            name: h.name,
            category: h.category,
            xp_value: h.xp,
            icon: h.icon,
            sort_order: i,
          }))
        )

      if (habitsError) {
        setSubmitError(habitsError.message)
        setLoading(false)
        return
      }
    }

    // 4. Insert rewards
    if (wizard.rewards.length > 0) {
      const { error: rewardsError } = await supabase
        .from('rewards')
        .insert(
          wizard.rewards.map(name => {
            const preset = REWARD_PRESETS.find(r => r.name === name)
            return {
              user_id: user.id,
              name,
              category: 'real_world',
              unlock_condition: preset?.unlockCondition ?? null,
            }
          })
        )

      if (rewardsError) {
        setSubmitError(rewardsError.message)
        setLoading(false)
        return
      }
    }

    router.push('/dashboard')
  }

  // ─── Derived values ─────────────────────────────────────────────────────────

  const totalXpPerDay = wizard.selectedHabits.reduce((sum, h) => sum + h.xp, 0)
  const hasFinance = wizard.selectedCategories.includes('finance')
  const availableRewards = REWARD_PRESETS.filter(r => !(r.isSpendBased && hasFinance))
  const customRewards = wizard.rewards.filter(r => !REWARD_PRESETS.some(p => p.name === r))

  // ─── Shared UI pieces ────────────────────────────────────────────────────────

  const progressPercent = Math.round((step / 8) * 100)

  const progressBar = (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="font-nunito text-xs text-muted">Step {step} of 8</span>
        <span className="font-nunito text-xs text-muted">{progressPercent}%</span>
      </div>
      <div className="w-full bg-border rounded-full h-1.5">
        <div
          className="bg-primary rounded-full h-1.5 transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  )

  const backBtn = (
    <button
      onClick={back}
      className="flex-1 rounded-lg border border-border bg-background text-foreground font-nunito text-sm py-2.5 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
    >
      ← Back
    </button>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* ── Step 1: Welcome ── */}
        {step === 1 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-12 shadow-sm text-center">
            {progressBar}
            <h1 className="font-lora text-5xl text-primary mb-3">Meado</h1>
            <p className="font-nunito text-muted text-base tracking-wide mb-3">
              Tend to yourself, every day.
            </p>
            <p className="font-nunito text-foreground text-sm mb-10 leading-relaxed">
              Let&apos;s set up your meadow.<br />Takes about 2 minutes.
            </p>
            <button
              onClick={next}
              className="w-full max-w-xs mx-auto block rounded-lg bg-primary text-background font-nunito font-semibold text-base py-3 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
            >
              Begin
            </button>
          </div>
        )}

        {/* ── Step 2: Your name ── */}
        {step === 2 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-8 text-center">
              What should we call you?
            </h2>
            <input
              ref={nameInputRef}
              type="text"
              value={wizard.name}
              onChange={e => setWizard(w => ({ ...w, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && wizard.name.trim()) next() }}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 font-nunito text-base text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              placeholder="Your name or nickname"
            />
            <div className="flex gap-3 mt-8">
              {backBtn}
              <button
                onClick={next}
                disabled={!wizard.name.trim()}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Currency ── */}
        {step === 3 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-2 text-center">
              Where are you based?
            </h2>
            <p className="font-nunito text-muted text-sm text-center mb-8">
              This sets your currency for any finance goals.
            </p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {CURRENCIES.map(c => {
                const selected = wizard.currency === c.code && !customCurrency
                return (
                  <button
                    key={c.code}
                    onClick={() => selectCurrency(c.code, c.symbol)}
                    className={`rounded-xl border-2 py-4 flex flex-col items-center gap-1 transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <span className={`text-2xl font-bold font-nunito ${selected ? 'text-primary' : 'text-foreground'}`}>
                      {c.symbol}
                    </span>
                    <span className="text-xs font-nunito text-muted">{c.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="space-y-1.5">
              <label className="block font-nunito text-sm text-foreground">
                Other currency symbol
              </label>
              <input
                type="text"
                value={customCurrency}
                onChange={e => handleCustomCurrency(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-nunito text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="e.g. ¥ or kr"
              />
            </div>
            <div className="flex gap-3 mt-8">
              {backBtn}
              <button
                onClick={next}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Categories ── */}
        {step === 4 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-8 text-center">
              What areas do you want to tend to?
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {CATEGORIES.map(cat => {
                const selected = wizard.selectedCategories.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className={`rounded-xl border-2 p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <div className={`font-nunito font-semibold text-sm mb-1 ${selected ? 'text-primary' : 'text-foreground'}`}>
                      {cat.label}
                    </div>
                    <div className="font-nunito text-xs text-muted leading-relaxed">
                      {cat.description}
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3 mt-8">
              {backBtn}
              <button
                onClick={next}
                disabled={wizard.selectedCategories.length === 0}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 5: Habits ── */}
        {step === 5 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-2 text-center">
              Choose your daily habits
            </h2>
            <p className="font-nunito text-muted text-sm text-center mb-6">
              3 to 5 is ideal to start.
            </p>
            <div className="space-y-6 max-h-72 overflow-y-auto pr-1">
              {wizard.selectedCategories.map(catId => {
                const cat = CATEGORIES.find(c => c.id === catId)!
                return (
                  <div key={catId}>
                    <h3 className="font-nunito font-semibold text-xs text-muted uppercase tracking-wider mb-3">
                      {cat.icon} {cat.label}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {HABIT_PRESETS[catId].map(habit => {
                        const selected = wizard.selectedHabits.some(
                          h => h.name === habit.name && h.category === habit.category
                        )
                        return (
                          <button
                            key={habit.name}
                            onClick={() => toggleHabit(habit)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-nunito text-xs transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                              selected
                                ? 'border-primary bg-primary text-background'
                                : 'border-border bg-background text-foreground hover:border-primary/50'
                            }`}
                          >
                            <span>{habit.icon}</span>
                            <span>{habit.name}</span>
                            <span className={`font-semibold ${selected ? 'text-background/80' : 'text-accent'}`}>
                              +{habit.xp}
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="font-nunito text-xs text-muted mt-4 text-center">
              {wizard.selectedHabits.length} selected
            </p>
            <div className="flex gap-3 mt-4">
              {backBtn}
              <button
                onClick={next}
                disabled={wizard.selectedHabits.length === 0}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Rewards ── */}
        {step === 6 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-2 text-center">
              What will you tend toward?
            </h2>
            <p className="font-nunito text-muted text-sm text-center mb-6">
              Pick 2 or 3 rewards to work toward.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {availableRewards.map(reward => {
                const selected = wizard.rewards.includes(reward.name)
                return (
                  <button
                    key={reward.name}
                    onClick={() => toggleReward(reward.name)}
                    className={`rounded-xl border-2 p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      selected
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    <div className={`font-nunito font-semibold text-sm mb-1 ${selected ? 'text-primary' : 'text-foreground'}`}>
                      {reward.name}
                    </div>
                    <div className="font-nunito text-xs text-muted">{reward.description}</div>
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={customReward}
                onChange={e => setCustomReward(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addCustomReward() }}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 font-nunito text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                placeholder="Add your own reward…"
              />
              <button
                onClick={addCustomReward}
                disabled={!customReward.trim()}
                className="rounded-lg border border-primary text-primary px-4 py-2.5 font-nunito text-sm hover:bg-primary/10 disabled:opacity-40 transition focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                Add
              </button>
            </div>
            {customRewards.map(name => (
              <div
                key={name}
                className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 mb-2"
              >
                <span className="font-nunito text-sm text-foreground">{name}</span>
                <button
                  onClick={() => removeReward(name)}
                  className="font-nunito text-xs text-muted hover:text-foreground transition ml-2"
                >
                  ✕
                </button>
              </div>
            ))}
            <div className="flex gap-3 mt-6">
              {backBtn}
              <button
                onClick={next}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 7: Boss Battle ── */}
        {step === 7 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
            {progressBar}
            <h2 className="font-lora text-3xl text-foreground mb-2 text-center">
              Every week you&apos;ll face a disturbance
            </h2>
            <p className="font-nunito text-muted text-sm text-center mb-8">
              Complete enough habits to restore calm to your meadow.
            </p>
            <div className="bg-background border border-border rounded-xl px-6 py-5 text-center mb-8">
              <div className="text-4xl mb-2">🌫️</div>
              <h3 className="font-lora text-xl text-foreground">{bossName}</h3>
            </div>
            <h3 className="font-nunito text-sm font-semibold text-foreground mb-3 text-center">
              Choose your weekly target
            </h3>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {[60, 70, 80, 90].map(pct => (
                <button
                  key={pct}
                  onClick={() => setWizard(w => ({ ...w, bossTarget: pct }))}
                  className={`rounded-lg border-2 py-3 font-nunito font-semibold text-sm transition focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                    wizard.bossTarget === pct
                      ? 'border-primary bg-primary text-background'
                      : 'border-border bg-background text-foreground hover:border-primary/50'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
            <p className="font-nunito text-sm text-muted text-center leading-relaxed bg-background border border-border rounded-lg px-4 py-3">
              Complete{' '}
              <span className="text-primary font-semibold">{wizard.bossTarget}%</span>
              {' '}of your habits this week to lift{' '}
              <span className="text-foreground font-semibold">{bossName}</span>
              {' '}from your meadow.
            </p>
            <div className="flex gap-3 mt-8">
              {backBtn}
              <button
                onClick={next}
                className="flex-1 rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 8: Complete ── */}
        {step === 8 && (
          <div className="bg-card border border-border rounded-2xl px-8 py-12 shadow-sm text-center">
            {progressBar}
            <div className="text-5xl mb-5">🌿</div>
            <h2 className="font-lora text-3xl text-foreground mb-8">
              Your meadow is ready.
            </h2>
            <div className="bg-background border border-border rounded-xl px-6 py-5 mb-8 text-left space-y-4">
              <div className="flex items-center gap-3 font-nunito text-sm text-foreground">
                <span className="text-xl">✨</span>
                <span>
                  <span className="font-semibold">{wizard.selectedHabits.length} habits</span> chosen
                </span>
              </div>
              <div className="flex items-center gap-3 font-nunito text-sm text-foreground">
                <span className="text-xl">🌱</span>
                <span>
                  <span className="font-semibold">{totalXpPerDay} seeds</span> possible per day
                </span>
              </div>
              <div className="flex items-center gap-3 font-nunito text-sm text-foreground">
                <span className="text-xl">🌫️</span>
                <span>
                  <span className="font-semibold">{bossName}</span> awaits
                </span>
              </div>
            </div>
            {submitError && (
              <p className="font-nunito text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mb-5">
                {submitError}
              </p>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-lg bg-primary text-background font-nunito font-semibold text-base py-3 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 transition"
            >
              {loading ? 'Setting up your meadow…' : 'Begin tending →'}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
