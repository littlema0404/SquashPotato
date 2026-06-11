import { NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

export async function GET() {
  try {
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
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('display_name, avatar_url, is_admin, status')
      .eq('id', userId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: 'Query error', details: error.message, userId }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found', userId }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
