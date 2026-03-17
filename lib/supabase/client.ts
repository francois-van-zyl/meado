/**
 * lib/supabase/client.ts
 *
 * Creates a Supabase browser client for use in Client Components
 * ('use client'). Call createClient() inside the component or handler
 * that needs it — do not import a singleton instance, as the client
 * must be created fresh per call to correctly pick up auth cookies.
 *
 * For Server Components, API routes, and middleware use
 * lib/supabase/server.ts instead.
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
