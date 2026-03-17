'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleMagicLink() {
    if (!email) {
      setError('Enter your email address above first.')
      return
    }
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })

    if (error) {
      setError(error.message)
    } else {
      setMagicLinkSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="bg-card border border-border rounded-2xl px-8 py-10 shadow-sm">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="font-lora text-4xl text-primary mb-2">Meado</h1>
        <p className="font-nunito text-muted text-sm tracking-wide">
          Tend to yourself, every day.
        </p>
      </div>

      {magicLinkSent ? (
        <div className="text-center py-4">
          <p className="font-nunito text-foreground text-sm leading-relaxed">
            Check your inbox — a sign-in link is on its way.
          </p>
          <button
            onClick={() => setMagicLinkSent(false)}
            className="mt-4 text-sm text-muted underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={handleSignIn} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block font-nunito text-sm text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-nunito text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block font-nunito text-sm text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 font-nunito text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="font-nunito text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary text-background font-nunito font-semibold text-sm py-2.5 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 border-t border-border" />
            <span className="font-nunito text-xs text-muted">or</span>
            <div className="flex-1 border-t border-border" />
          </div>

          <button
            type="button"
            onClick={handleMagicLink}
            disabled={loading}
            className="w-full rounded-lg border border-border bg-background text-foreground font-nunito text-sm py-2.5 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 transition"
          >
            Continue with magic link
          </button>
        </form>
      )}

      <p className="mt-8 text-center font-nunito text-sm text-muted">
        New here?{' '}
        <Link href="/signup" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
          Create an account
        </Link>
      </p>
    </div>
  )
}
