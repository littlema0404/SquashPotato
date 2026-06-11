'use client'

import { Clock, MapPin, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Registration, SessionWithRegistrations } from '@/lib/types'

interface SessionCardProps {
  session: SessionWithRegistrations
  userRegistration: Registration | null
  onSelect: (session: SessionWithRegistrations) => void
}

export default function SessionCard({
  session,
  userRegistration,
  onSelect,
}: SessionCardProps) {
  const isRegistered = userRegistration?.status === 'confirmed'

  const confirmedCount =
    session.registrations?.filter((r) => r.status === 'confirmed').length ?? 0

  const startTime = session.start_time.slice(0, 5)
  const endTime = session.end_time.slice(0, 5)

  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      onClick={() => onSelect(session)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(session)
        }
      }}
      className="relative cursor-pointer touch-manipulation transition-colors hover:ring-foreground/20 active:scale-[0.99]"
    >
      <CardContent className="flex items-stretch gap-3 p-3">
        <div className="flex min-w-[64px] flex-shrink-0 items-center gap-2 text-sm font-semibold text-foreground">
          <Clock className="size-3.5 shrink-0" />
          <div className="flex flex-col leading-tight">
            <span>{startTime}</span>
            <span>{endTime}</span>
          </div>
        </div>

        <Separator orientation="vertical" className="self-stretch" />

        <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 pr-12">
          <h3 className="truncate text-base font-medium text-foreground">{session.title}</h3>
          <p className="flex items-center gap-1 truncate text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{session.location}</span>
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            {session.max_players === 0 ? (
              <span>不開放登記</span>
            ) : (
              <>
                <Users className="size-3.5" />
                <span>{confirmedCount} 人</span>
                <span aria-hidden>·</span>
                <span>{session.court_count} 面場</span>
              </>
            )}
          </p>
        </div>

        {isRegistered ? (
          <Badge
            variant="secondary"
            className="absolute top-1/2 right-3 flex-shrink-0 -translate-y-1/2 border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
          >
            ✓ 已報名
          </Badge>
        ) : null}
      </CardContent>
    </Card>
  )
}
