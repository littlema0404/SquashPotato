'use client'

import { useLiff } from '@/components/LiffProvider'
import { Spinner } from '@/components/ui/spinner'

export default function InitialLoader({ children }: { children: React.ReactNode }) {
  const { isReady } = useLiff()

  if (!isReady) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Spinner className="size-8 text-muted-foreground" />
      </div>
    )
  }

  return children
}
