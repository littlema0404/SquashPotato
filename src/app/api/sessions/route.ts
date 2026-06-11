import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

async function getUserId(): Promise<string | null> {
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

  return userId
}

export async function GET(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')

    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: sessions, error } = await supabaseAdmin
      .from('sessions')
      .select(`
        *,
        registrations (*),
        profiles!sessions_created_by_fkey (display_name, avatar_url)
      `)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true })

    if (error) {
      console.error('Fetch sessions error:', error)
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 })
    }

    return NextResponse.json(sessions || [])
  } catch (err) {
    console.error('Sessions API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { title, date, startTime, endTime, location, courtCount, maxPlayers, description } = body

    if (!title?.trim() || !date || !startTime || !endTime || !location?.trim() || !courtCount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('sessions').insert({
      title: title.trim(),
      date,
      start_time: startTime,
      end_time: endTime,
      location: location.trim(),
      court_count: courtCount,
      max_players: maxPlayers?.trim() ? parseInt(maxPlayers, 10) : null,
      description: description?.trim() || null,
      created_by: userId,
    })

    if (error) {
      console.error('Create session error:', error)
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Session API error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
