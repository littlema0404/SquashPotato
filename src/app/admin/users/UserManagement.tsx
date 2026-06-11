'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { UserCog } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface UserManagementProps {
  users: Profile[]
  currentUserId: string
}

export default function UserManagement({ users: initialUsers, currentUserId }: UserManagementProps) {
  const [users, setUsers] = useState(initialUsers)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [removeUserId, setRemoveUserId] = useState<string | null>(null)

  const pendingUsers = users.filter(u => u.status === 'pending')
  const approvedUsers = users.filter(u => u.status === 'approved')
  const rejectedUsers = users.filter(u => u.status === 'rejected')

  const tabs = [
    { key: 'pending' as const, label: '待審核', count: pendingUsers.length },
    { key: 'approved' as const, label: '已通過', count: approvedUsers.length },
    ...(rejectedUsers.length > 0 ? [{ key: 'rejected' as const, label: '已拒絕', count: rejectedUsers.length }] : []),
  ]

  const getUsersForTab = (tabKey: 'pending' | 'approved' | 'rejected') => {
    switch (tabKey) {
      case 'pending': return pendingUsers
      case 'approved': return approvedUsers
      case 'rejected': return rejectedUsers
    }
  }

  const updateUser = (userId: string, patch: Partial<Profile>) => {
    setUsers(users.map(u => u.id === userId ? { ...u, ...patch } : u))
  }

  const handleApprove = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates: { status: 'approved' } }),
    })
    if (!res.ok) {
      toast.error('操作失敗')
      return
    }
    updateUser(userId, { status: 'approved' })
    toast.success('已通過審核')
  }

  const handleReject = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates: { status: 'rejected' } }),
    })
    if (!res.ok) {
      toast.error('操作失敗')
      return
    }
    updateUser(userId, { status: 'rejected' })
    toast.success('已拒絕')
  }

  const handleToggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates: { is_admin: !currentIsAdmin } }),
    })
    if (!res.ok) {
      toast.error('操作失敗')
      return
    }
    updateUser(userId, { is_admin: !currentIsAdmin })
  }

  const handleRemove = async (userId: string) => {
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, updates: { status: 'rejected' } }),
    })
    if (!res.ok) {
      toast.error('操作失敗')
      return
    }
    updateUser(userId, { status: 'rejected' })
    toast.success('已退出')
    setRemoveUserId(null)
  }

  const currentUsers = getUsersForTab(activeTab)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <UserCog className="size-5 text-primary" />
          用戶管理
        </h2>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label} <span className="ml-1 text-xs text-muted-foreground">({tab.count})</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <UserSection
        title={tabs.find(t => t.key === activeTab)?.label || ''}
        count={currentUsers.length}
        countVariant={
          activeTab === 'pending' ? 'warning'
          : activeTab === 'approved' ? 'success'
          : 'destructive'
        }
        users={currentUsers}
        emptyText={
          activeTab === 'pending' ? '無待審核用戶'
          : activeTab === 'approved' ? '無已通過用戶'
          : '無已拒絕用戶'
        }
        showAdminBadge={activeTab === 'approved'}
        actions={(user) => {
          if (activeTab === 'pending') {
            return (
              <>
                <Button size="sm" onClick={() => handleApprove(user.id)}>通過</Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(user.id)}
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  拒絕
                </Button>
              </>
            )
          }
          if (activeTab === 'approved') {
            return user.id !== currentUserId ? (
              <ButtonGroup>
                <Button size="sm" variant="outline" onClick={() => handleToggleAdmin(user.id, user.is_admin)}>
                  {user.is_admin ? '取消管理員' : '設為管理員'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRemoveUserId(user.id)}>
                  退出
                </Button>
              </ButtonGroup>
            ) : null
          }
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleApprove(user.id)}
              className="border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
            >
              重新通過
            </Button>
          )
        }}
      />
      <AlertDialog
        open={removeUserId !== null}
        onOpenChange={(open) => { if (!open) setRemoveUserId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要讓此用戶退出嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              退出後用戶將無法使用本系統，可稍後在「已拒絕」分頁重新通過。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => { if (removeUserId) void handleRemove(removeUserId) }}
            >
              確認退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

interface UserSectionProps {
  title: string
  count: number
  countVariant: 'warning' | 'success' | 'destructive'
  users: Profile[]
  showAdminBadge?: boolean
  muted?: boolean
  emptyText?: string
  actions: (user: Profile) => React.ReactNode
}

function UserSection({
  title,
  count,
  countVariant,
  users,
  showAdminBadge,
  muted,
  emptyText,
  actions,
}: UserSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <Badge
          variant={
            countVariant === 'warning'
              ? 'secondary'
              : countVariant === 'success'
                ? 'default'
                : 'destructive'
          }
        >
          {count}
        </Badge>
      </div>
      {users.length === 0 && emptyText ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {users.map(user => (
            <Card key={user.id} className={muted ? 'opacity-70' : undefined}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="size-10">
                    {user.avatar_url ? <AvatarImage src={user.avatar_url} alt="" /> : null}
                    <AvatarFallback>{user.display_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-foreground">{user.display_name}</p>
                      {showAdminBadge && user.is_admin ? (
                        <Badge variant="default" className="text-xs">管理員</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString('zh-TW')} 加入
                    </p>
                  </div>
                </div>
                <div className="flex flex-shrink-0 gap-2">{actions(user)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
