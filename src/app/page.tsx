import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import Calendar from '@/components/Calendar'
import LoginPage from '@/components/LoginPage'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getLiffUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('liff_session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, AUTH_SECRET)
    return (payload.sub as string) || null
  } catch {
    return null
  }
}

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id || null

  if (!userId) {
    userId = await getLiffUserId()
  }

  if (!userId) {
    return <LoginPage />
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile || profile.status !== 'approved') {
    return <LoginPage />
  }

  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString()

  const { data: sessions } = await supabaseAdmin
    .from('sessions')
    .select(`
      *,
      registrations (*),
      profiles!sessions_created_by_fkey (display_name, avatar_url)
    `)
    .gte('date', startDate.split('T')[0])
    .lte('date', endDate.split('T')[0])
    .order('date', { ascending: true })

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full p-4">
      <Calendar sessions={sessions || []} userId={userId} />
    </main>
  )
}
