import { NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import { createClient } from '@supabase/supabase-js'

const LINE_VERIFY_URL = 'https://api.line.me/oauth2/v2.1/verify'
const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)
const JWT_EXPIRY = '7d'

interface LineTokenVerifyResponse {
  sub: string
  channel_id: string
  exp: number
  iat: number
  nonce: string
  name: string
  picture?: string
  email?: string
}

async function verifyLineIdToken(idToken: string): Promise<LineTokenVerifyResponse> {
  const res = await fetch(LINE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: idToken,
      client_id: process.env.LINE_CHANNEL_ID!,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('LINE verify error:', res.status, body)
    throw new Error(`LINE token verification failed: ${res.status}`)
  }

  return res.json()
}

async function createSessionJwt(userId: string, lineUserId: string): Promise<string> {
  return new SignJWT({ sub: userId, lineUserId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRY)
    .sign(AUTH_SECRET)
}

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 })
    }

    const lineUser = await verifyLineIdToken(idToken)
    const displayName = lineUser.name?.trim() ? lineUser.name.trim() : '未知用戶'
    console.log('LIFF auth: verified line user', lineUser.sub, displayName)

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. 查找已註冊的 profile
    const { data: existingProfile, error: lookupError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('line_user_id', lineUser.sub)
      .maybeSingle()

    if (lookupError) {
      console.error('LIFF auth: profile lookup error', JSON.stringify(lookupError))
    }

    // 2. 已註冊 → 直接建立 session
    if (existingProfile) {
      console.log('LIFF auth: found existing profile', existingProfile.id, existingProfile.status)
      if (existingProfile.status === 'rejected') {
        return NextResponse.json({ status: 'rejected' })
      }

      const token = await createSessionJwt(existingProfile.id, lineUser.sub)

      const response = NextResponse.json({
        status: existingProfile.status,
        profile: {
          display_name: existingProfile.display_name,
          avatar_url: existingProfile.avatar_url,
          is_admin: existingProfile.is_admin,
        },
      })

      response.cookies.set('liff_session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })

      return response
    }

    // 3. 檢查是否有已存在的 LINE 身份（從 Supabase LINE OAuth 來的）
    // 用 listUsers 搜尋 identities 中有 LINE sub 的用戶
    const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 10000,
    })
    const existingAuthUser = usersData?.users?.find(u =>
      u.identities?.some(i => i.provider === 'line' && i.id === lineUser.sub)
    )

    if (existingAuthUser) {
      console.log('LIFF auth: found existing LINE identity for', existingAuthUser.id)

      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', existingAuthUser.id)
        .maybeSingle()

      if (existingProfile) {
        console.log('LIFF auth: profile exists, updating line_user_id')
        await supabaseAdmin
          .from('profiles')
          .update({
            line_user_id: lineUser.sub,
            display_name: displayName,
            avatar_url: lineUser.picture || null,
          })
          .eq('id', existingAuthUser.id)

        const token = await createSessionJwt(existingAuthUser.id, lineUser.sub)
        const response = NextResponse.json({
          status: existingProfile.status,
          profile: {
            display_name: existingProfile.display_name,
            avatar_url: existingProfile.avatar_url,
            is_admin: existingProfile.is_admin,
          },
        })
        response.cookies.set('liff_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 7,
        })
        return response
      }

      // 有 auth user 但無 profile → 建立
      console.log('LIFF auth: creating profile for existing auth user')
      const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
        id: existingAuthUser.id,
        line_user_id: lineUser.sub,
        display_name: displayName,
        avatar_url: lineUser.picture || null,
        status: 'pending',
      })

      if (insertErr) {
        console.error('LIFF auth: insert profile error (existing auth)', JSON.stringify(insertErr))
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
      }

      console.log('LIFF auth: profile created for existing auth user')
      return NextResponse.json({ status: 'pending' })
    }

    // 4. 全新用戶 → 建立 auth user + profile
    console.log('LIFF auth: no existing identity found, creating new user for', lineUser.sub)

    const placeholderEmail = `line-${lineUser.sub}@liff.local`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: placeholderEmail,
      email_confirm: true,
      user_metadata: {
        full_name: displayName,
        avatar_url: lineUser.picture,
        provider: 'liff',
        provider_id: lineUser.sub,
      },
    })

    if (authError) {
      console.error('LIFF auth: createUser error', JSON.stringify(authError))

      // auth user 已存在（可能之前建立過但 profile 沒成功）
      if (authError.message?.includes('already registered')) {
        console.log('LIFF auth: auth user already exists, attempting to find it')

        // 用 listUsers 搜尋
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        })

        const existingAuthUser = usersData?.users?.find(u => u.email === placeholderEmail)

        if (existingAuthUser) {
          console.log('LIFF auth: found existing auth user', existingAuthUser.id)

          // 先檢查 profile 是否已存在，存在則更新 line_user_id
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', existingAuthUser.id)
            .maybeSingle()

          if (existingProfile) {
            console.log('LIFF auth: profile exists, updating line_user_id')
            const { error: updateErr } = await supabaseAdmin
              .from('profiles')
              .update({
                line_user_id: lineUser.sub,
                display_name: displayName,
                avatar_url: lineUser.picture || null,
              })
              .eq('id', existingAuthUser.id)

            if (updateErr) {
              console.error('LIFF auth: update profile error', JSON.stringify(updateErr))
              return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
            }
          } else {
            console.log('LIFF auth: creating profile for existing auth user')
            const { error: insertErr } = await supabaseAdmin.from('profiles').insert({
              id: existingAuthUser.id,
              line_user_id: lineUser.sub,
              display_name: displayName,
              avatar_url: lineUser.picture || null,
              status: 'pending',
            })

            if (insertErr) {
              console.error('LIFF auth: insert profile error (existing auth)', JSON.stringify(insertErr))
              return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
            }
          }

          console.log('LIFF auth: profile ready for existing auth user')
          return NextResponse.json({ status: 'pending' })
        }
      }

      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    if (!authData?.user?.id) {
      console.error('LIFF auth: createUser returned no user id', JSON.stringify(authData))
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }

    console.log('LIFF auth: created auth user', authData.user.id)

    const { error: insertError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      line_user_id: lineUser.sub,
      display_name: displayName,
      avatar_url: lineUser.picture || null,
      status: 'pending',
    })

    if (insertError) {
      console.error('LIFF auth: insert profile error', JSON.stringify(insertError))
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    console.log('LIFF auth: profile created, status=pending')
    return NextResponse.json({ status: 'pending' })
  } catch (err) {
    console.error('LIFF auth error:', err)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
  }
}
