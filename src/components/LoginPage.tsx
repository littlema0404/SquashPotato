'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Ban } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useLiff } from '@/components/LiffProvider'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

function LiffStatusScreen({
  message,
  error,
  loading = false,
}: {
  message?: string
  error?: string
  loading?: boolean
}) {
  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="size-8 text-muted-foreground" />
          {message ? (
            <p className="text-muted-foreground">{message}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
          <Ban className="size-8 text-red-600" />
        </div>
        {error ? (
          <Alert variant="destructive" className="text-left">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  )
}

export default function LoginPage() {
  const { isReady, isLoggedIn, isInClient, idToken, error: liffError } = useLiff()
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!isReady || !isLoggedIn || !idToken) return

    let cancelled = false

    async function syncSession() {
      try {
        const res = await fetch('/api/auth/liff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })

        const data = await res.json()

        if (cancelled) return

        if (!res.ok) {
          if (data.error === 'not_registered') {
            setSyncError('此帳號尚未註冊，請先透過瀏覽器登入完成註冊')
          } else {
            setSyncError(data.error || '驗證失敗')
          }
          return
        }

        if (data.status === 'approved') {
          window.location.reload()
        } else if (data.status === 'pending') {
          window.location.href = '/pending'
        } else if (data.status === 'rejected') {
          window.location.href = '/rejected'
        }
      } catch (err) {
        if (!cancelled) {
          console.error('LIFF sync error:', err)
          setSyncError('網路錯誤，請稍後再試')
        }
      }
    }

    syncSession()

    return () => { cancelled = true }
  }, [isReady, isLoggedIn, idToken])

  const handleBrowserLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'custom:line',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'profile openid email',
      },
    })
  }

  if (isInClient && !isReady) {
    return <LiffStatusScreen loading />
  }

  if (isInClient && liffError) {
    return (
      <LiffStatusScreen error={`初始化失敗：${liffError.message}`} />
    )
  }

  if (isInClient && isLoggedIn && !idToken) {
    return (
      <LiffStatusScreen error="無法取得驗證資訊，請確認 LINE Developers 中 LIFF App 的 Scope 已勾選 openid" />
    )
  }

  if (isInClient && isLoggedIn) {
    if (syncError) {
      return <LiffStatusScreen error={syncError} />
    }
    return <LiffStatusScreen loading />
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-20 items-center justify-center overflow-hidden rounded-3xl">
            <Image
              src="/logo.png"
              alt="JJSquash Logo"
              width={80}
              height={80}
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">JJSquash</h1>
          <p className="mt-1 text-muted-foreground">打球登記小本本</p>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div>
              <h2 className="text-lg font-medium text-foreground">歡迎使用 LINE 帳號登入</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                請點選下方 LINE 登入按鈕
              </p>
            </div>

            <Button
              onClick={handleBrowserLogin}
              className="w-full bg-[#06C755] py-6 text-white hover:bg-[#05b34b]"
            >
              <svg className="size-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINE 登入
            </Button>

            <div className="border-t border-border pt-3">
              <p className="text-center text-xs text-muted-foreground">
                登入後需等待管理員審核通過方可使用
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
