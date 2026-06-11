import { MessageCircleX } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function RejectedPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Card>
          <CardContent className="p-6">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100">
              <MessageCircleX className="size-8 text-red-600" />
            </div>

            <h1 className="text-lg font-medium text-foreground">
              審核未通過
            </h1>
            <p className="mt-2 text-muted-foreground">
              您的帳號未通過管理員審核，無法使用相關功能。
              如有問題請聯繫球隊管理員。
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
