'use client'

import { Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TimePickerProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  ariaInvalid?: boolean
  fromHour?: number
  toHour?: number
}

export function TimePicker({
  value,
  onChange,
  placeholder = '選擇時間',
  ariaInvalid,
  fromHour = 0,
  toHour = 23,
}: TimePickerProps) {
  const hours = Array.from({ length: toHour - fromHour + 1 }, (_, i) =>
    String(fromHour + i).padStart(2, '0')
  )

  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger
        aria-invalid={ariaInvalid}
        className="h-11 w-full"
      >
        <span className="flex items-center gap-2">
          <Clock className="size-4 text-muted-foreground" />
          <SelectValue placeholder={placeholder} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {hours.map((h) => (
          <SelectItem key={h} value={`${h}:00`}>
            {h}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
