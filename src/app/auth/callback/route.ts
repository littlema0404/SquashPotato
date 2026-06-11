import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { NextResponse } from 'next/server'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/`)
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Exchange code error:', error)
    return NextResponse.redirect(`${origin}/`)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/`)
  }

  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 從 auth user 的 identities 取得 LINE sub（如 U...）
  let lineSub = user.user_metadata?.sub as string || ''

  if (!lineSub) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id)
      const lineIdentity = authUser?.user?.identities?.find(
        i => i.provider === 'line' || i.provider === 'custom:line'
      )
      if (lineIdentity?.id) {
        lineSub = lineIdentity.id
      }
    } catch (e) {
      console.error('Callback: getUserById threw', String(e))
    }
  }

  // 檢查是否已有 LIFF 建立的 profile（line_user_id = LINE sub）
  if (lineSub) {
    const { data: linkedProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('line_user_id', lineSub)
      .maybeSingle()

    if (linkedProfile && linkedProfile.id !== user.id) {
      // 已有 LIFF 帳號 A → 刪除剛建立的帳號 B，改用 A 登入
      console.log('Callback: found existing LIFF profile', linkedProfile.id, 'deleting new auth user', user.id)

      await supabaseAdmin.auth.admin.deleteUser(user.id)

      const token = await new SignJWT({ sub: linkedProfile.id, lineUserId: lineSub })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(AUTH_SECRET)

      const redirectUrl = linkedProfile.status === 'approved' ? origin
        : linkedProfile.status === 'rejected' ? `${origin}/rejected`
        : `${origin}/pending`

      const response = NextResponse.redirect(redirectUrl)
      response.cookies.set('liff_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
      return response
    }
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!existingProfile) {
    const displayName = user.user_metadata?.full_name || user.user_metadata?.name || '未知用戶'
    const avatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      line_user_id: lineSub || user.id,
      display_name: displayName,
      avatar_url: avatarUrl,
      status: 'pending',
    })

    if (insertError) {
      console.error('Insert profile error:', insertError)
    }

    return NextResponse.redirect(`${origin}/pending`)
  }

  if (existingProfile.status === 'approved') {
    return NextResponse.redirect(`${origin}/`)
  } else if (existingProfile.status === 'pending') {
    return NextResponse.redirect(`${origin}/pending`)
  } else {
    return NextResponse.redirect(`${origin}/rejected`)
  }
}
