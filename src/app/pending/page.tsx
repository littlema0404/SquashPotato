'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircleWarning } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

export default function PendingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)

  const handleRefresh = async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'approved') {
          window.location.href = '/'
        } else if (data.status === 'rejected') {
          window.location.href = '/rejected'
        } else {
          router.refresh()
        }
      }
    } catch {
      router.refresh()
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Card>
          <CardContent className="p-6">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-yellow-100">
              <MessageCircleWarning className="size-8 text-yellow-600" />
            </div>

            <h1 className="text-lg font-medium text-foreground">
              帳號審核中
            </h1>
            <p className="mt-2 text-muted-foreground">
              您的帳號審核已送出，正在等待管理員確認。
              <br />
              審核通過後即可使用本系統。
            </p>

            <p className="mt-4 text-sm text-muted-foreground">
              如有問題請聯繫球隊管理員。
            </p>

            <Button
              onClick={handleRefresh}
              disabled={checking}
              className="mt-4 w-full"
            >
              {checking ? (
                <Spinner className="size-4" />
              ) : (
                '重新整理'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
