import { createServerClient } from '@supabase/ssr'
import { jwtVerify } from 'jose'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_SECRET = new TextEncoder().encode(process.env.AUTH_SECRET)

interface LiffJwtPayload {
  sub: string
  lineUserId: string
  exp: number
  iat: number
}

async function verifyLiffSession(cookieValue: string): Promise<LiffJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(cookieValue, AUTH_SECRET)
    return payload as unknown as LiffJwtPayload
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 公開路徑不需要登入
  const publicPaths = ['/auth/callback', '/pending', '/rejected', '/api/auth/liff', '/api/auth/logout']
  if (publicPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
    return supabaseResponse
  }

  // 嘗試 Supabase session
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, is_admin')
      .eq('id', user.id)
      .single()

    // 首頁不 redirect，讓 page.tsx 自己處理（避免 LIFF 流程被中斷）
    if (request.nextUrl.pathname === '/') {
      const response = supabaseResponse
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      return response
    }

    if (!profile) {
      const url = request.nextUrl.clone()
      url.pathname = '/pending'
      return NextResponse.redirect(url)
    }

    if (profile.status !== 'approved') {
      const url = request.nextUrl.clone()
      if (profile.status === 'pending') {
        url.pathname = '/pending'
      } else {
        url.pathname = '/rejected'
      }
      if (request.nextUrl.pathname !== url.pathname) {
        return NextResponse.redirect(url)
      }
    }

    const response = supabaseResponse
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    return response
  }

  // 嘗試 LIFF session cookie
  const liffSessionCookie = request.cookies.get('liff_session')?.value
  if (liffSessionCookie) {
    const payload = await verifyLiffSession(liffSessionCookie)

    if (payload?.sub) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('status, is_admin')
        .eq('id', payload.sub)
        .single()

      if (profile) {
        if (profile.status !== 'approved') {
          const url = request.nextUrl.clone()
          if (profile.status === 'pending') {
            url.pathname = '/pending'
          } else {
            url.pathname = '/rejected'
          }
          if (request.nextUrl.pathname !== url.pathname) {
            return NextResponse.redirect(url)
          }
        }

        const response = supabaseResponse
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
        response.headers.set('Pragma', 'no-cache')
        return response
      }
    }
  }

  // 未登入 → 不 redirect，讓首頁顯示登入頁
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
