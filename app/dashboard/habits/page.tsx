'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, X, Check, EyeOff, Eye } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type HabitRow = {
  id:        string
  name:      string
  category:  string
  icon:      string
  xp_value:  number
  is_active: boolean
}

type FormState = {
  name:     string
  icon:     string
  xp_value: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = { name: '', icon: '', xp_value: 10 }

const CATEGORIES = [
  { key: 'health',       label: 'Health',        color: '#7A9E7E' },
  { key: 'fitness',      label: 'Fitness',        color: '#D4858A' },
  { key: 'finance',      label: 'Finance',        color: '#E8A840' },
  { key: 'mental_health',label: 'Mental Health',  color: '#A89BC4' },
] as const

// ─── Component ────────────────────────────────────────────────────────────────

export default function HabitsPage() {
  const [habits, setHabits]                   = useState<HabitRow[]>([])
  const [loading, setLoading]                 = useState(true)
  const [editingId, setEditingId]             = useState<string | null>(null)
  const [addingCategory, setAddingCategory]   = useState<string | null>(null)
  const [form, setForm]                       = useState<FormState>(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget]       = useState<{ id: string; name: string } | null>(null)
  const [saving, setSaving]                   = useState(false)

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('habits')
          .select('id, name, category, icon, xp_value, is_active')
          .eq('user_id', user.id)
          .order('sort_order')

        if (data) setHabits(data)
        setLoading(false)
      })()
    })
  }, [])

  function startEdit(habit: HabitRow) {
    setAddingCategory(null)
    setEditingId(habit.id)
    setForm({ name: habit.name, icon: habit.icon, xp_value: habit.xp_value })
  }

  function startAdd(category: string) {
    setEditingId(null)
    setAddingCategory(category)
    setForm(EMPTY_FORM)
  }

  function cancelForm() {
    setEditingId(null)
    setAddingCategory(null)
    setForm(EMPTY_FORM)
  }

  async function saveHabit(category: string) {
    if (!form.name.trim()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (editingId) {
      const { data } = await supabase
        .from('habits')
        .update({ name: form.name.trim(), icon: form.icon.trim(), xp_value: form.xp_value })
        .eq('id', editingId)
        .select('id, name, category, icon, xp_value, is_active')
        .single()
      if (data) setHabits(prev => prev.map(h => h.id === editingId ? data : h))
    } else {
      const { data } = await supabase
        .from('habits')
        .insert({
          user_id:  user.id,
          name:     form.name.trim(),
          icon:     form.icon.trim(),
          xp_value: form.xp_value,
          category,
          is_active: true,
        })
        .select('id, name, category, icon, xp_value, is_active')
        .single()
      if (data) setHabits(prev => [...prev, data])
    }

    setSaving(false)
    cancelForm()
  }

  async function toggleActive(habit: HabitRow) {
    const newActive = !habit.is_active
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, is_active: newActive } : h))

    const supabase = createClient()
    await supabase.from('habits').update({ is_active: newActive }).eq('id', habit.id)
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const supabase = createClient()
    await supabase.from('habits').delete().eq('id', deleteTarget.id)
    setHabits(prev => prev.filter(h => h.id !== deleteTarget.id))
    setDeleteTarget(null)
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const activeHabits  = habits.filter(h => h.is_active)
  const totalSeeds    = activeHabits.reduce((sum, h) => sum + h.xp_value, 0)

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-card rounded-lg" />
        <div className="h-4 w-40 bg-card rounded" />
        <div className="h-8 w-36 bg-card rounded-full" />
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-card rounded-2xl" />)}
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* ── Header ── */}
        <div>
          <h1 className="font-lora text-3xl text-foreground leading-tight">Your habits</h1>
          <p className="font-nunito text-sm text-muted mt-1">Tend to what matters most.</p>
        </div>

        {/* ── Seeds pill ── */}
        {totalSeeds > 0 && (
          <span className="inline-flex items-center gap-1.5 bg-primary/15 text-primary font-nunito font-semibold text-xs px-3 py-1.5 rounded-full">
            🌱 {totalSeeds} seeds possible today
          </span>
        )}

        {/* ── Category groups ── */}
        {CATEGORIES.map(cat => {
          const catHabits = habits.filter(h => h.category === cat.key)
          const isAdding  = addingCategory === cat.key

          return (
            <div key={cat.key} className="bg-card border border-border rounded-2xl overflow-hidden">

              {/* Category header */}
              <div
                className="px-5 py-3 flex items-center gap-2"
                style={{ borderLeft: `4px solid ${cat.color}` }}
              >
                <h2 className="font-lora font-semibold text-foreground text-base">{cat.label}</h2>
                <span className="font-nunito text-xs text-muted ml-auto">
                  {catHabits.filter(h => h.is_active).length} active
                </span>
              </div>

              {/* Habit rows */}
              {catHabits.length > 0 && (
                <div className="divide-y divide-border border-t border-border">
                  {catHabits.map(habit => (
                    <div key={habit.id}>
                      {/* Habit row */}
                      <div
                        className={`flex items-center gap-3 pl-0 pr-4 py-3 transition-opacity ${
                          habit.is_active ? '' : 'opacity-50'
                        }`}
                      >
                        {/* Accent bar */}
                        <div
                          className="self-stretch w-1 flex-shrink-0 rounded-r"
                          style={{ backgroundColor: cat.color }}
                        />

                        {/* Icon + name */}
                        <div className="flex-1 min-w-0">
                          <span className="font-nunito text-sm text-foreground">
                            {habit.icon} {habit.name}
                          </span>
                        </div>

                        {/* XP badge */}
                        <span
                          className="font-nunito text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                        >
                          {habit.xp_value} seeds
                        </span>

                        {/* Edit */}
                        <button
                          onClick={() => editingId === habit.id ? cancelForm() : startEdit(habit)}
                          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-background transition-colors flex-shrink-0"
                          aria-label="Edit habit"
                        >
                          <Pencil size={14} />
                        </button>

                        {/* Active toggle */}
                        <button
                          onClick={() => toggleActive(habit)}
                          className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-background transition-colors flex-shrink-0"
                          aria-label={habit.is_active ? 'Hide habit' : 'Show habit'}
                        >
                          {habit.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteTarget({ id: habit.id, name: habit.name })}
                          className="p-1.5 rounded-lg text-muted hover:text-[#D4858A] hover:bg-background transition-colors flex-shrink-0"
                          aria-label="Delete habit"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Inline edit form */}
                      {editingId === habit.id && (
                        <HabitForm
                          form={form}
                          onChange={setForm}
                          onSave={() => saveHabit(cat.key)}
                          onCancel={cancelForm}
                          saving={saving}
                          color={cat.color}
                          mode="edit"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add habit button */}
              {!isAdding && (
                <button
                  onClick={() => startAdd(cat.key)}
                  className="w-full flex items-center gap-2 px-5 py-3 font-nunito text-sm text-muted hover:text-primary hover:bg-background/60 transition-colors border-t border-border"
                >
                  <Plus size={15} />
                  Add habit
                </button>
              )}

              {/* Inline add form */}
              {isAdding && (
                <div className="border-t border-border">
                  <HabitForm
                    form={form}
                    onChange={setForm}
                    onSave={() => saveHabit(cat.key)}
                    onCancel={cancelForm}
                    saving={saving}
                    color={cat.color}
                    mode="add"
                  />
                </div>
              )}
            </div>
          )
        })}

        {habits.length === 0 && (
          <p className="font-nunito text-sm text-muted text-center py-4">
            No habits yet — add some above to begin tending.
          </p>
        )}

      </div>

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setDeleteTarget(null)}
          />
          <div className="relative bg-card border border-border rounded-2xl px-6 py-6 max-w-sm w-full shadow-lg">
            <h3 className="font-lora text-lg text-foreground mb-2">Remove habit?</h3>
            <p className="font-nunito text-sm text-muted mb-5">
              Remove <span className="font-semibold text-foreground">{deleteTarget.name}</span> from
              your meadow? This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 font-nunito text-sm px-4 py-2.5 rounded-xl border border-border text-muted hover:bg-background transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 font-nunito text-sm px-4 py-2.5 rounded-xl bg-[#D4858A] text-white hover:bg-[#c07479] transition-colors font-semibold"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Inline habit form ────────────────────────────────────────────────────────

function HabitForm({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
  color,
  mode,
}: {
  form:     FormState
  onChange: (f: FormState) => void
  onSave:   () => void
  onCancel: () => void
  saving:   boolean
  color:    string
  mode:     'add' | 'edit'
}) {
  const inputClass =
    'w-full bg-background border border-border rounded-lg px-3 py-2 font-nunito text-sm text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary/40'

  return (
    <div className="px-4 py-4 space-y-3 bg-background/50">
      <input
        type="text"
        placeholder="Habit name"
        value={form.name}
        onChange={e => onChange({ ...form, name: e.target.value })}
        className={inputClass}
        autoFocus
        onKeyDown={e => { if (e.key === 'Enter') onSave() }}
      />

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Icon e.g. 💧"
          value={form.icon}
          onChange={e => onChange({ ...form, icon: e.target.value })}
          className={`${inputClass} w-36`}
        />
        <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
          <button
            type="button"
            onClick={() => onChange({ ...form, xp_value: Math.max(5, form.xp_value - 5) })}
            disabled={form.xp_value <= 5}
            className="w-6 h-6 flex items-center justify-center rounded font-nunito font-bold text-muted hover:text-foreground hover:bg-card transition-colors disabled:opacity-30"
          >
            −
          </button>
          <span className="flex-1 text-center font-nunito text-sm font-semibold text-foreground">
            {form.xp_value} seeds
          </span>
          <button
            type="button"
            onClick={() => onChange({ ...form, xp_value: Math.min(50, form.xp_value + 5) })}
            disabled={form.xp_value >= 50}
            className="w-6 h-6 flex items-center justify-center rounded font-nunito font-bold text-muted hover:text-foreground hover:bg-card transition-colors disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-nunito text-sm text-muted hover:bg-card transition-colors border border-border"
        >
          <X size={13} /> Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-nunito text-sm font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: color }}
        >
          <Check size={13} />
          {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add habit'}
        </button>
      </div>
    </div>
  )
}
