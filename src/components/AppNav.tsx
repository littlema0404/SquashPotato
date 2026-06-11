import { headers } from 'next/headers'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { isLineInAppBrowser } from '@/lib/user-agent'
import Header from './Header'
import BottomNav from './BottomNav'

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

export default async function AppNav() {
  const headersList = await headers()
  const isLiffClient = isLineInAppBrowser(headersList.get('user-agent'))

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userId = user?.id || null
  if (!userId) {
    userId = await getLiffUserId()
  }

  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, is_admin')
    .eq('id', userId)
    .single()

  if (!profile) return null

  if (isLiffClient) {
    return <BottomNav user={profile} />
  }

  return <Header user={profile} />
}
