import { createClient } from '@/lib/supabase/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import NewSessionForm from './NewSessionForm'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

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

export default async function NewSessionPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id || null

  if (!userId) {
    userId = await getLiffUserId()
  }

  if (!userId) {
    redirect('/auth/callback?action=login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profile || !profile.is_admin) {
    redirect('/')
  }

  return (
    <main className="flex-1 max-w-2xl mx-auto w-full p-4">
      <NewSessionForm userId={userId} />
    </main>
  )
}
