'use client'

import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  value: string
  onChange: (v: string) => void
  min?: string
  placeholder?: string
  ariaInvalid?: boolean
}

export function DatePicker({
  value,
  onChange,
  min,
  placeholder = '選擇日期',
  ariaInvalid,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const date = value ? new Date(value) : undefined
  const minDate = min ? new Date(min) : undefined

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-invalid={ariaInvalid}
            className={cn(
              'h-11 w-full justify-start px-3 font-normal',
              !date && 'text-muted-foreground'
            )}
          />
        }
      >
        <CalendarIcon className="size-4" />
        {date ? format(date, 'yyyy / MM / dd') : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) onChange(format(d, 'yyyy-MM-dd'))
            setOpen(false)
          }}
          disabled={minDate ? { before: minDate } : undefined}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}
