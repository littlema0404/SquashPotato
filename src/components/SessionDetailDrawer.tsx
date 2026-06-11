'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, startOfDay } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  AlignLeft,
  X,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type {
  Registration,
  SessionWithRegistrations,
} from '@/lib/types'

interface RegistrationWithProfile extends Registration {
  profiles?: {
    display_name: string
    avatar_url: string | null
  }
}

interface SessionDetailDrawerProps {
  session: SessionWithRegistrations | null
  userId: string
  userRegistration: Registration | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function SessionDetailDrawer({
  session,
  userId,
  userRegistration: initialUserRegistration,
  open,
  onOpenChange,
}: SessionDetailDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [optimistic, setOptimistic] = useState<Registration | null>(null)
  const [registrations, setRegistrations] = useState<RegistrationWithProfile[]>([])
  const [registrationsLoading, setRegistrationsLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()

  const userRegistration = optimistic ?? initialUserRegistration

  const lastSessionIdRef = useRef<string | null>(null)
  if (lastSessionIdRef.current !== (session?.id ?? null)) {
    lastSessionIdRef.current = session?.id ?? null
    setOptimistic(null)
    setRegistrations([])
  }

  useEffect(() => {
    if (!session || !open) return
    const sessionId = session.id
    let cancelled = false
    async function fetchRegistrations() {
      setRegistrationsLoading(true)
      try {
        const res = await fetch(`/api/registrations/join?sessionId=${encodeURIComponent(sessionId)}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            setRegistrations(data || [])
          }
        }
      } catch {
        // ignore fetch error
      } finally {
        if (!cancelled) {
          setRegistrationsLoading(false)
        }
      }
    }
    fetchRegistrations()
    return () => {
      cancelled = true
    }
  }, [session, open, refreshKey])

  if (!session) return null

  const confirmed = registrations.filter(r => r.status === 'confirmed')
  const isCancelled = session.status === 'cancelled'
  const isPast = new Date(session.date) < startOfDay(new Date())
  const dateObj = new Date(session.date)

  const handleRegister = async () => {
    if (!session) return
    setLoading(true)
    try {
      const res = await fetch('/api/registrations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error || '操作失敗')
      }

      const { status } = await res.json()

      if (userRegistration) {
        setOptimistic({ ...userRegistration, status })
        toast.success(status === 'cancelled' ? '已取消報名' : '報名成功！')
      } else {
        setOptimistic({
          id: 'optimistic',
          session_id: session.id,
          user_id: userId,
          status: 'confirmed',
          position: null,
          registered_at: new Date().toISOString(),
        })
        toast.success('報名成功！')
      }
      setRefreshKey(k => k + 1)
      router.refresh()
    } catch (error) {
      console.error('Registration error:', error)
      toast.error('操作失敗，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <div className="flex items-start justify-between gap-2">
            <DrawerTitle className="text-xl">{session.title}</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" aria-label="關閉" className="-mt-1 -mr-2">
                <X className="size-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <DrawerDescription asChild>
            <div className="space-y-3">
              <InfoRow
                icon={<Calendar className="size-4" />}
                text={format(dateObj, 'yyyy 年 M 月 d 日（EEEE）', { locale: zhTW })}
              />
              <InfoRow
                icon={<Clock className="size-4" />}
                text={`${session.start_time.slice(0, 5)} ~ ${session.end_time.slice(0, 5)}`}
              />
              <InfoRow
                icon={<MapPin className="size-4" />}
                text={session.location}
              />
              <InfoRow
                icon={<Building2 className="size-4" />}
                text={`${session.court_count} 面場`}
              />
              <InfoRow
                icon={<Users className="size-4" />}
                text={`${confirmed.length} 人`}
              />
              {session.description ? (
                <div className="flex items-start gap-3 pt-1 text-muted-foreground">
                  <AlignLeft className="size-4 mt-0.5 flex-shrink-0" />
                  <p className="whitespace-pre-wrap text-sm">{session.description}</p>
                </div>
              ) : null}
            </div>
          </DrawerDescription>

          <Separator className="my-5" />

          <div className="pb-4">
            <h3 className="mb-3 text-sm font-medium text-foreground">
              登記名單{!registrationsLoading && ` (${confirmed.length})`}
            </h3>
            {registrationsLoading ? (
              <div className="flex justify-center py-4">
                <Spinner className="size-5 text-muted-foreground" />
              </div>
            ) : confirmed.length === 0 ? (
              <p className="text-sm text-muted-foreground">尚無人報名</p>
            ) : (
              <ul className="space-y-2">
                {confirmed.map(reg => (
                  <li key={reg.id}>
                    <Card size="sm" className="bg-muted/50 py-0">
                      <CardContent className="flex items-center gap-3 p-2">
                        <Avatar className="size-8">
                          {reg.profiles?.avatar_url ? (
                            <AvatarImage src={reg.profiles.avatar_url} alt="" />
                          ) : null}
                          <AvatarFallback>
                            {reg.profiles?.display_name?.charAt(0) || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate text-sm text-foreground">
                          {reg.profiles?.display_name}
                        </span>
                        {reg.user_id === userId ? (
                          <span className="ml-auto flex-shrink-0 text-xs font-medium text-primary">
                            你
                          </span>
                        ) : null}
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <DrawerFooter className="border-t border-border bg-background pb-[env(safe-area-inset-bottom)]">
          {isCancelled ? (
            <Alert variant="destructive">
              <AlertTitle>此場次已取消</AlertTitle>
            </Alert>
          ) : isPast ? (
            <Button variant="secondary" disabled className="h-12 w-full">
              此場次已結束
            </Button>
          ) : session.max_players === 0 ? (
            <Alert>
              <AlertDescription>本場次不開放報名</AlertDescription>
            </Alert>
          ) : userRegistration?.status === 'confirmed' ? (
            <Button
              variant="outline"
              onClick={handleRegister}
              disabled={loading}
              className="h-12 w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <UserMinus className="size-4" />
              {loading ? '處理中…' : '取消報名'}
            </Button>
          ) : (
            <Button onClick={handleRegister} disabled={loading} className="h-12 w-full">
              <UserPlus className="size-4" />
              {loading ? '處理中…' : '我要報名'}
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function InfoRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-foreground">
      <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
      <span className="text-sm">{text}</span>
    </div>
  )
}
