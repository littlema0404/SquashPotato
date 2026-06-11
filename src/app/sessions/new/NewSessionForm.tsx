'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay } from 'date-fns'
import {
  Plus,
  AlertCircle,
  FilePlus,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { DatePicker } from '@/components/DatePicker'
import { TimePicker } from '@/components/TimePicker'
import { Spinner } from '@/components/ui/spinner'

interface NewSessionFormProps {
  userId: string
}

interface FormState {
  title: string
  date: string
  startTime: string
  endTime: string
  location: string
  courtCount: number
  maxPlayers: string
  description: string
}

interface FormErrors {
  title?: string
  date?: string
  startTime?: string
  endTime?: string
  location?: string
  courtCount?: string
  maxPlayers?: string
}

const todayStr = () => format(startOfDay(new Date()), 'yyyy-MM-dd')

const timeToMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const initialState: FormState = {
  title: '',
  date: '',
  startTime: '19:00',
  endTime: '21:00',
  location: '',
  courtCount: 1,
  maxPlayers: '',
  description: '',
}

export default function NewSessionForm({ userId }: NewSessionFormProps) {
  const router = useRouter()
  const titleRef = useRef<HTMLInputElement>(null)

  const [values, setValues] = useState<FormState>(initialState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues(prev => ({ ...prev, [key]: value }))
  }

  function validate(v: FormState): FormErrors {
    const e: FormErrors = {}
    if (!v.title.trim()) e.title = '請輸入場次標題'
    else if (v.title.length > 60) e.title = '標題最多 60 字'

    if (!v.date) e.date = '請選擇日期'
    else if (v.date < todayStr()) e.date = '不能選擇過去的日期'

    if (!v.startTime) e.startTime = '請選擇開始時間'
    else if (!/^\d{2}:00$/.test(v.startTime)) e.startTime = '時間需為整點'
    if (!v.endTime) e.endTime = '請選擇結束時間'
    else if (!/^\d{2}:00$/.test(v.endTime)) e.endTime = '時間需為整點'
    if (v.startTime && v.endTime && timeToMinutes(v.endTime) <= timeToMinutes(v.startTime)) {
      e.endTime = '結束時間需晚於開始時間'
    }

    if (!v.location.trim()) e.location = '請輸入場地名稱'

    if (!Number.isInteger(v.courtCount) || v.courtCount < 1) {
      e.courtCount = '場數至少 1'
    }

    if (v.maxPlayers.trim()) {
      const n = parseInt(v.maxPlayers, 10)
      if (!Number.isInteger(n) || n < 0) {
        e.maxPlayers = '請輸入正整數或 0'
      } else if (n > 0 && n < v.courtCount) {
        e.maxPlayers = '人數需 ≥ 場數'
      }
    }

    return e
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const v = validate(values)
    setErrors(v)
    if (Object.keys(v).length > 0) {
      const firstKey = Object.keys(v)[0]
      const el = document.querySelector<HTMLElement>(`[name="${firstKey}"]`)
      el?.focus()
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setLoading(true)
    setSubmitError(null)

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: values.title.trim(),
        date: values.date,
        startTime: values.startTime + ':00',
        endTime: values.endTime + ':00',
        location: values.location.trim(),
        courtCount: values.courtCount,
        maxPlayers: values.maxPlayers.trim() || null,
        description: values.description.trim() || null,
      }),
    })

    setLoading(false)

    if (!res.ok) {
      const body = await res.json()
      setSubmitError(body.error || '建立失敗，請稍後再試')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="flex items-center justify-between gap-2 mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <FilePlus className="size-5 text-primary" />
          新增場次
        </h2>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <Spinner />
              建立中…
            </>
          ) : (
            <>
              <Plus className="size-4" />
              建立
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <Field label="場次標題" required error={errors.title}>
            <Input
              ref={titleRef}
              name="title"
              value={values.title}
              onChange={e => update('title', e.target.value)}
              placeholder="例：週三壁球夜"
              maxLength={60}
              autoComplete="off"
              className="h-11"
              aria-invalid={!!errors.title}
            />
          </Field>

          <Field label="場地名稱" required error={errors.location}>
            <Input
              name="location"
              value={values.location}
              onChange={e => update('location', e.target.value)}
              placeholder="例：○○壁球館"
              autoComplete="off"
              className="h-11"
              aria-invalid={!!errors.location}
            />
          </Field>

          <Field label="備註" hint="選填">
            <Textarea
              name="description"
              rows={3}
              value={values.description}
              onChange={e => update('description', e.target.value)}
              placeholder="例如：需自備球拍，19:00 集合"
              className="resize-y"
            />
          </Field>

          <Field label="日期" required error={errors.date}>
            <DatePicker
              value={values.date}
              onChange={(v) => update('date', v)}
              min={todayStr()}
              placeholder="選擇日期"
              ariaInvalid={!!errors.date}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="開始時間" required error={errors.startTime}>
              <TimePicker
                value={values.startTime}
                onChange={(v) => update('startTime', v)}
                placeholder="選擇時間"
                ariaInvalid={!!errors.startTime}
              />
            </Field>
            <Field label="結束時間" required error={errors.endTime}>
              <TimePicker
                value={values.endTime}
                onChange={(v) => update('endTime', v)}
                placeholder="選擇時間"
                ariaInvalid={!!errors.endTime}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="場數" error={errors.courtCount}>
              <Input
                name="courtCount"
                type="number"
                inputMode="numeric"
                min="1"
                value={values.courtCount}
                onChange={e => update('courtCount', parseInt(e.target.value, 10) || 0)}
                className="h-11"
                aria-invalid={!!errors.courtCount}
              />
            </Field>
            <Field label="最大人數" hint="留空表示不限" error={errors.maxPlayers}>
              <Input
                name="maxPlayers"
                type="number"
                inputMode="numeric"
                min="1"
                value={values.maxPlayers}
                onChange={e => update('maxPlayers', e.target.value)}
                placeholder="不限"
                className="h-11"
                aria-invalid={!!errors.maxPlayers}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {submitError ? (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle />
          <AlertDescription>{submitError}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <Alert variant="destructive" className="mt-1 py-2">
          <AlertCircle />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
