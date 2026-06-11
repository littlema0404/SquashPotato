import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

async function getAdminUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const liffToken = cookieStore.get('liff_session')?.value

  let userId: string | null = null

  if (liffToken) {
    try {
      const { payload } = await jwtVerify(liffToken, AUTH_SECRET)
      userId = (payload.sub as string) || null
    } catch {
      // invalid token
    }
  }

  if (!userId) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id || null
  }

  if (!userId) return null

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()

  return profile?.is_admin ? userId : null
}

export async function POST(request: Request) {
  try {
    const adminId = await getAdminUserId()
    if (!adminId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId, updates } = await request.json()

    if (!userId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Missing userId or updates' }, { status: 400 })
    }

    const allowedFields = ['status', 'is_admin']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key]
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { error } = await supabaseAdmin
      .from('profiles')
      .update(sanitized)
      .eq('id', userId)

    if (error) {
      console.error('Update profile error:', error)
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Admin users API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
