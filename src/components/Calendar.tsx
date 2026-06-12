'use client'

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { format, isSameDay, startOfDay, isBefore, addMonths, addDays } from 'date-fns'
import { CalendarDays, List, ChevronLeft, ChevronRight, CalendarX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MonthCalendar from './MonthCalendar'
import SessionCard from './SessionCard'
import SessionDetailDrawer from './SessionDetailDrawer'
import type {
  Registration,
  SessionWithRegistrations,
} from '@/lib/types'

interface CalendarProps {
  sessions: SessionWithRegistrations[]
  userId: string
}

type ViewMode = 'list' | 'calendar'

const VIEW_MODE_COOKIE = 'jjsquash-view-mode'
const viewModeListeners = new Set<() => void>()
let viewModeCache: ViewMode = 'list'

function readViewModeCookie(): ViewMode {
  if (typeof document === 'undefined') return 'list'
  const match = document.cookie
    .split('; ')
    .find((r) => r.startsWith(`${VIEW_MODE_COOKIE}=`))
  return match?.split('=')[1] === 'calendar' ? 'calendar' : 'list'
}

function setViewModeCookie(v: ViewMode) {
  document.cookie = `${VIEW_MODE_COOKIE}=${v}; path=/; max-age=31536000; SameSite=Lax`
  viewModeCache = v
  viewModeListeners.forEach((cb) => cb())
}

if (typeof document !== 'undefined') {
  viewModeCache = readViewModeCookie()
}

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      viewModeListeners.add(cb)
      return () => {
        viewModeListeners.delete(cb)
      }
    },
    () => viewModeCache,
    () => 'list' as ViewMode
  )
  return [value, setViewModeCookie]
}

function getRelativeDateLabel(date: Date, today: Date): string | null {
  if (isSameDay(date, today)) return '今天'
  if (isSameDay(date, addDays(today, 1))) return '明天'
  if (isSameDay(date, addDays(today, 2))) return '後天'
  return null
}

export default function Calendar({ sessions, userId }: CalendarProps) {
  const today = useMemo(() => startOfDay(new Date()), [])
  const [viewMode, setViewMode] = useViewMode()
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [month, setMonth] = useState<Date>(today)
  const [openSession, setOpenSession] = useState<SessionWithRegistrations | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [extraSessions, setExtraSessions] = useState<SessionWithRegistrations[]>([])
  const [loading, setLoading] = useState(false)

  const allSessions = useMemo(() => {
    const merged = [...sessions, ...extraSessions]
    const unique = new Map<string, SessionWithRegistrations>()
    for (const s of merged) {
      unique.set(s.id, s)
    }
    return Array.from(unique.values())
  }, [sessions, extraSessions])

  const fetchMonthSessions = useCallback(async (monthDate: Date) => {
    setLoading(true)
    const start = format(monthDate, 'yyyy-MM-01')
    const end = format(addMonths(monthDate, 2), 'yyyy-MM-01')
    try {
      const res = await fetch(`/api/sessions?start=${start}&end=${end}`)
      if (res.ok) {
        const data = await res.json()
        const startMonth = format(monthDate, 'yyyy-MM')
        const endMonth = format(addMonths(monthDate, 1), 'yyyy-MM')
        setExtraSessions(prev => {
          const filtered = prev.filter(
            s => !s.date.startsWith(startMonth) && !s.date.startsWith(endMonth)
          )
          return [...filtered, ...data]
        })
      }
    } catch {
      // ignore fetch error
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMonthSessions(month)
  }, [month, fetchMonthSessions])

  useEffect(() => {
    setExtraSessions([])
  }, [sessions])

  useEffect(() => {
    const handleReset = () => {
      setMonth(today)
      setSelectedDate(today)
    }
    window.addEventListener('reset-calendar', handleReset)
    return () => window.removeEventListener('reset-calendar', handleReset)
  }, [today])

  const userRegistrationMap = useMemo(() => {
    const map = new Map<string, Registration>()
    for (const s of allSessions) {
      const reg = s.registrations?.find((r) => r.user_id === userId && r.status === 'confirmed')
      if (reg) map.set(s.id, reg)
    }
    return map
  }, [allSessions, userId])

  const futureSessions = useMemo(() => {
    const todayKey = format(today, 'yyyy-MM-dd')
    return allSessions
      .filter((s) => s.status === 'open' && s.date >= todayKey)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.start_time.localeCompare(b.start_time)
      })
  }, [allSessions, today])

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, SessionWithRegistrations[]>()
    for (const s of allSessions) {
      if (s.status !== 'open') continue
      const existing = map.get(s.date) ?? []
      existing.push(s)
      map.set(s.date, existing)
    }
    return map
  }, [allSessions])

  const dayHasSession = useMemo(() => {
    return (date: Date) => {
      const key = format(date, 'yyyy-MM-dd')
      return (sessionsByDate.get(key)?.length ?? 0) > 0
    }
  }, [sessionsByDate])

  const dayHasRegistration = useMemo(() => {
    return (date: Date) => {
      const key = format(date, 'yyyy-MM-dd')
      const daySessions = sessionsByDate.get(key) ?? []
      return daySessions.some(s => userRegistrationMap.has(s.id))
    }
  }, [sessionsByDate, userRegistrationMap])

  const selectedDateKey = format(selectedDate, 'yyyy-MM-dd')
  const selectedSessions = useMemo(
    () => sessionsByDate.get(selectedDateKey) ?? [],
    [sessionsByDate, selectedDateKey],
  )

  const handleSelectSession = (session: SessionWithRegistrations) => {
    setOpenSession(session)
    setDrawerOpen(true)
  }

  const handleViewModeChange = (v: string) => {
    const newMode = v as ViewMode
    if (newMode === 'calendar' && viewMode === 'calendar') {
      setMonth(today)
      setSelectedDate(today)
    }
    setViewMode(newMode)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <CalendarDays className="size-5 text-primary" />
          場次總覽
        </h2>
        <Tabs value={viewMode} onValueChange={handleViewModeChange}>
          <TabsList>
            <TabsTrigger value="list">
              <List className="size-4" /> 列表
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarDays className="size-4" /> 月曆
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {viewMode === 'list' ? (
        <ListView
          sessions={futureSessions}
          userRegistrationMap={userRegistrationMap}
          onSelectSession={handleSelectSession}
          today={today}
        />
      ) : (
        <CalendarView
          month={month}
          setMonth={setMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dayHasSession={dayHasSession}
          dayHasRegistration={dayHasRegistration}
          selectedSessions={selectedSessions}
          userRegistrationMap={userRegistrationMap}
          onSelectSession={handleSelectSession}
          today={today}
          loading={loading}
        />
      )}

      <SessionDetailDrawer
        session={openSession}
        userId={userId}
        userRegistration={openSession ? (userRegistrationMap.get(openSession.id) ?? null) : null}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  )
}

function ListView({
  sessions,
  userRegistrationMap,
  onSelectSession,
  today,
}: {
  sessions: SessionWithRegistrations[]
  userRegistrationMap: Map<string, Registration>
  onSelectSession: (s: SessionWithRegistrations) => void
  today: Date
}) {
  if (sessions.length === 0) {
    return (
      <Empty className="border py-16">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX />
          </EmptyMedia>
          <EmptyTitle>這天沒有場次</EmptyTitle>
          <EmptyDescription>請聯絡管理員新增場次</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const grouped = sessions.reduce<
    Record<string, { date: Date; sessions: SessionWithRegistrations[] }>
  >((acc, s) => {
    const [y, m, d] = s.date.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const key = s.date
    if (!acc[key]) acc[key] = { date, sessions: [] }
    acc[key].sessions.push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.keys(grouped).map(key => {
        const { date, sessions: daySessions } = grouped[key]
        const isToday = isSameDay(date, today)
        const isPast = isBefore(date, today) && !isToday
        const relativeLabel = getRelativeDateLabel(date, today)
        return (
          <div key={key}>
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <div
                className={`text-sm font-semibold ${
                  isToday ? 'text-primary' : 'text-foreground'
                }`}
              >
                {format(date, 'M月d日')}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  週{['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                </span>
                {relativeLabel ? (
                  <span className="text-xs font-normal text-muted-foreground">，{relativeLabel}</span>
                ) : null}
              </div>
              {isPast ? (
                <span className="text-xs text-muted-foreground">已過</span>
              ) : null}
            </div>
            <div className="space-y-2">
              {daySessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  userRegistration={userRegistrationMap.get(session.id) ?? null}
                  onSelect={onSelectSession}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function CalendarView({
  month,
  setMonth,
  selectedDate,
  setSelectedDate,
  dayHasSession,
  dayHasRegistration,
  selectedSessions,
  userRegistrationMap,
  onSelectSession,
  today,
  loading,
}: {
  month: Date
  setMonth: (d: Date) => void
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  dayHasSession: (d: Date) => boolean
  dayHasRegistration: (d: Date) => boolean
  selectedSessions: SessionWithRegistrations[]
  userRegistrationMap: Map<string, Registration>
  onSelectSession: (s: SessionWithRegistrations) => void
  today: Date
  loading: boolean
}) {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={loading}
          aria-label="上個月"
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="flex items-center gap-2">
          {loading ? <Spinner className="size-4 text-muted-foreground" /> : null}
          <div className="text-sm font-semibold text-foreground">
            {format(month, 'yyyy 年 M 月')}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={loading}
          aria-label="下個月"
        >
          <ChevronRight className="size-5" />
        </Button>
      </div>

      <div className="px-2 pt-2">
        <MonthCalendar
          month={month}
          setMonth={setMonth}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          dayHasSession={dayHasSession}
          dayHasRegistration={dayHasRegistration}
          today={today}
        />
      </div>

      <CardContent className="border-t border-border p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-foreground">
            {format(selectedDate, 'M月d日')}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              週{['日', '一', '二', '三', '四', '五', '六'][selectedDate.getDay()]}
            </span>
            {getRelativeDateLabel(selectedDate, today) ? (
              <span className="text-xs font-normal text-muted-foreground">，{getRelativeDateLabel(selectedDate, today)}</span>
            ) : null}
          </div>
          {selectedSessions.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {selectedSessions.length} 個場次
            </span>
          ) : null}
        </div>

        {selectedSessions.length === 0 ? (
          <Empty className="border-none p-0 py-8">
            <EmptyHeader>
              <EmptyTitle>這天沒有場次</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {selectedSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                userRegistration={userRegistrationMap.get(session.id) ?? null}
                onSelect={onSelectSession}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
