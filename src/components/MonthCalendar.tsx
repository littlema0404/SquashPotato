'use client'

import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

interface MonthCalendarProps {
  month: Date
  setMonth: (d: Date) => void
  selectedDate: Date
  setSelectedDate: (d: Date) => void
  dayHasSession: (d: Date) => boolean
  dayHasRegistration: (d: Date) => boolean
  today: Date
}

export default function MonthCalendar({
  month,
  selectedDate,
  setSelectedDate,
  dayHasSession,
  dayHasRegistration,
  today,
}: MonthCalendarProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  return (
    <div className="px-2 pt-2">
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((day) => {
          const inMonth = isSameMonth(day, month)
          const isToday = isSameDay(day, today)
          const isSelected = isSameDay(day, selectedDate)
          const isFuture = isAfter(day, today) && !isToday
          const hasSession = dayHasSession(day)
          const hasRegistration = dayHasRegistration(day)

          return (
            <div key={day.toISOString()} className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                onClick={() => setSelectedDate(day)}
                aria-pressed={isSelected}
                aria-label={format(day, 'yyyy-MM-dd')}
                className={cn(
                  'relative size-11 touch-manipulation rounded-full p-0',
                  isSelected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground',
                  !isSelected && isToday && 'font-semibold text-primary',
                  !isSelected && inMonth && isFuture && 'text-foreground',
                  !isSelected && inMonth && !isFuture && !isToday && 'text-muted-foreground',
                  !isSelected && !inMonth && 'text-muted-foreground/40',
                )}
              >
                <span>{day.getDate()}</span>
                {hasRegistration ? (
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full',
                      isSelected ? 'bg-green-300' : 'bg-green-500',
                    )}
                  />
                ) : hasSession ? (
                  <span
                    className={cn(
                      'absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full',
                      isSelected ? 'bg-primary-foreground' : 'bg-primary',
                    )}
                  />
                ) : null}
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
