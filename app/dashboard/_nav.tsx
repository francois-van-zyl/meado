'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/dashboard',         label: 'Meadow',  icon: '🌿' },
  { href: '/dashboard/habits',  label: 'Habits',  icon: '🌱' },
  { href: '/dashboard/rewards', label: 'Rewards', icon: '✨' },
  { href: '/dashboard/log',     label: 'Log',     icon: '📖' },
]

export function DashboardNav({ displayName }: { displayName: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    if (signingOut) return
    setSigningOut(true)

    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-card border-r border-border z-20">
        <div className="px-6 py-6 border-b border-border">
          <h1 className="font-lora text-2xl text-primary">Meado</h1>
          {displayName && (
            <p className="font-nunito text-xs text-muted mt-0.5 truncate">{displayName}</p>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-nunito text-sm transition-colors ${
                isActive(item.href)
                  ? 'bg-primary/15 text-primary font-semibold'
                  : 'text-foreground hover:bg-background hover:text-primary'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-3 border-t border-border">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-nunito text-sm text-foreground hover:bg-background hover:text-primary transition-colors disabled:opacity-60"
          >
            <span className="text-lg leading-none">↩</span>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20 h-16 flex items-stretch">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              isActive(item.href) ? 'text-primary' : 'text-muted hover:text-foreground'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span className={`font-nunito text-[10px] ${isActive(item.href) ? 'font-semibold' : ''}`}>
              {item.label}
            </span>
          </Link>
        ))}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-muted hover:text-foreground transition-colors disabled:opacity-60"
        >
          <span className="text-xl leading-none">↩</span>
          <span className="font-nunito text-[10px]">
            {signingOut ? 'Wait…' : 'Sign out'}
          </span>
        </button>
      </nav>
    </>
  )
}
