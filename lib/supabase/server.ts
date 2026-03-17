/**
 * lib/supabase/server.ts
 *
 * Creates a Supabase server client for use in Server Components, Route
 * Handlers, and server actions. Must be async because it awaits the
 * Next.js cookie store.
 *
 * The setAll try/catch is intentional — when called from a Server
 * Component (as opposed to a Route Handler), cookie mutations are
 * silently ignored by Next.js. The catch prevents that from throwing.
 * For client-side Supabase access use lib/supabase/client.ts instead.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookie mutations are ignored.
          }
        },
      },
    }
  )
}
