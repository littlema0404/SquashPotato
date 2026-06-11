'use client'

import Link from 'next/link'
import Image from 'next/image'
import { LogOut, FilePlus, UserCog, Sun, Moon, Monitor } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { useLiff } from './LiffProvider'

interface HeaderProps {
  user?: {
    display_name: string
    avatar_url: string | null
    is_admin: boolean
  } | null
}

export default function Header({ user }: HeaderProps) {
  if (!user) return null

  const { setTheme, theme } = useTheme()
  const { isInClient } = useLiff()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  const initial = user.display_name?.[0] ?? '?'

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex min-h-14 max-w-[1200px] items-center justify-between px-4 pt-[env(safe-area-inset-top)]">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/logo.png"
            alt="JJSquash"
            width={32}
            height={32}
            className="size-8 flex-shrink-0 rounded-lg"
          />
          <h1 className="truncate text-base font-semibold text-foreground">
            JJSquash
          </h1>
        </Link>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={(props) => (
                <Button
                  {...props}
                  variant="ghost"
                  size="icon"
                  aria-label="開啟選單"
                  className="size-9 shrink-0 rounded-full p-0"
                >
                  <Avatar className="size-9">
                    {user.avatar_url ? (
                      <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    ) : null}
                    <AvatarFallback>{initial}</AvatarFallback>
                  </Avatar>
                </Button>
              )}
            />
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    {user.display_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.is_admin ? '管理員' : '一般會員'}
                  </span>
                </div>
              </div>
              {user.is_admin ? (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">管理功能</div>
                  <DropdownMenuItem
                    onClick={() => (window.location.href = '/admin/users')}
                  >
                    <UserCog className="size-4" /> 用戶管理
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => (window.location.href = '/sessions/new')}
                  >
                    <FilePlus className="size-4" /> 新增場次
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : null}
              <div className="px-2 py-1.5 text-xs text-muted-foreground">顯示模式</div>
              <DropdownMenuItem
                onClick={() => setTheme('light')}
                className={theme === 'light' ? 'bg-accent' : ''}
              >
                <Sun className="size-4" /> 淺色
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme('dark')}
                className={theme === 'dark' ? 'bg-accent' : ''}
              >
                <Moon className="size-4" /> 深色
              </DropdownMenuItem>
              {!isInClient ? (
                <DropdownMenuItem
                  onClick={() => setTheme('system')}
                  className={theme === 'system' ? 'bg-accent' : ''}
                >
                  <Monitor className="size-4" /> 跟隨系統
                </DropdownMenuItem>
              ) : null}
              {!isInClient ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                    <LogOut className="size-4" /> 登出
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
