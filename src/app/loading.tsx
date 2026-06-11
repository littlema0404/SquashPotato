import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
