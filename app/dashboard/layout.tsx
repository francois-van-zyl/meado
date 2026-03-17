import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from './_nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let displayName: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    displayName = profile?.display_name ?? null
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav displayName={displayName} />
      {/* pb-20 leaves room for mobile bottom nav; md:pl-56 offsets the sidebar */}
      <main className="md:pl-56 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  )
}
