'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Sun, Moon, FilePlus, UserCog } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface BottomNavProps {
  user: {
    display_name: string
    avatar_url: string | null
    is_admin: boolean
  }
}

export default function BottomNav({ user }: BottomNavProps) {
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()

  const initial = user.display_name?.[0] ?? '?'

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-center pb-[env(safe-area-inset-bottom)]">
      <ButtonGroup className="my-4 mx-8 rounded-full border bg-background shadow-lg">
        <Button
          variant="ghost"
          render={<Link href="/" />}
          onClick={() => {
            if (pathname === '/') {
              window.dispatchEvent(new Event('reset-calendar'))
            }
          }}
          className={cn(
            'size-12 min-w-12 rounded-full',
            pathname === '/' ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          <Home className="size-6" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={(props) => (
              <Button
                {...props}
                variant="ghost"
                className="size-12 min-w-12 rounded-full text-muted-foreground"
              >
                <Avatar className="size-6">
                  {user.avatar_url ? (
                    <AvatarImage src={user.avatar_url} alt={user.display_name} />
                  ) : null}
                  <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
                </Avatar>
              </Button>
            )}
          />
          <DropdownMenuContent align="center" className="mb-2 w-48">
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
              </>
            ) : null}
            <DropdownMenuSeparator />
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
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </nav>
  )
}
