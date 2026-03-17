/**
 * proxy.ts
 *
 * Next.js 16 middleware (exported as `proxy`, not `middleware`). Handles
 * all auth-based routing: redirects unauthenticated users away from
 * protected routes, redirects authenticated users away from auth pages,
 * and gates /dashboard behind completed onboarding.
 *
 * Important: Next.js 16 uses proxy.ts instead of middleware.ts. Having
 * both files causes a silent blank-screen error with no console output.
 * All routing logic must live here only — do not create middleware.ts.
 * Onboarding completion is detected by the presence of display_name in
 * the profiles table: null means new user, any value means ready.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — must not run any code between createServerClient and
  // getUser() or the session may not be refreshed correctly.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')
  const isAuthPage =
    pathname === '/login' || pathname === '/signup' || pathname === '/confirm'
  const isDashboard = pathname.startsWith('/dashboard')

  // Unauthenticated user hitting a protected route → login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // Authenticated user on auth pages or dashboard — profile check needed
  if (user && (isAuthPage || isDashboard)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    const hasProfile = Boolean(profile?.display_name)

    if (isAuthPage) {
      // Logged-in users shouldn't linger on auth pages
      const dest = request.nextUrl.clone()
      dest.pathname = hasProfile ? '/dashboard' : '/onboarding'
      return NextResponse.redirect(dest)
    }

    if (isDashboard && !hasProfile) {
      // Dashboard requires completed onboarding
      const dest = request.nextUrl.clone()
      dest.pathname = '/onboarding'
      return NextResponse.redirect(dest)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
