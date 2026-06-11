import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const liffToken = cookieStore.get('liff_session')?.value

  if (liffToken) {
    try {
      const { payload } = await jwtVerify(liffToken, AUTH_SECRET)
      return (payload.sub as string) || null
    } catch {
      // invalid token
    }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id || null
}

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json()

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status')
      .eq('id', userId)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Not approved' }, { status: 403 })
    }

    const { data: existing } = await supabaseAdmin
      .from('registrations')
      .select('id, status')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      const nextStatus = existing.status === 'cancelled' ? 'confirmed' : 'cancelled'
      const { error } = await supabaseAdmin
        .from('registrations')
        .update({ status: nextStatus })
        .eq('id', existing.id)

      if (error) {
        console.error('Registration update error:', error)
        return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
      }

      return NextResponse.json({ status: nextStatus })
    }

    const { error } = await supabaseAdmin
      .from('registrations')
      .insert({
        session_id: sessionId,
        user_id: userId,
        status: 'confirmed',
      })

    if (error) {
      console.error('Registration insert error:', error)
      return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
    }

    return NextResponse.json({ status: 'confirmed' })
  } catch (err) {
    console.error('Registration API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('status, is_admin')
      .eq('id', userId)
      .single()

    if (!profile || (profile.status !== 'approved' && !profile.is_admin)) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data } = await supabaseAdmin
      .from('registrations')
      .select('*, profiles (display_name, avatar_url)')
      .eq('session_id', sessionId)

    return NextResponse.json(data || [])
  } catch (err) {
    console.error('Registration fetch error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
