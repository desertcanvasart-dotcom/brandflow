'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { ROLE_LABELS } from '@/lib/constants'
import type { UserRole } from '@/types/enums'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  creator: 'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
  client: 'bg-orange-100 text-orange-700',
}

export function ProjectTeam({ projectId }: { projectId: string }) {
  const { data: members, isLoading } = trpc.member.list.useQuery()
  const { data: tasks } = trpc.task.list.useQuery({ projectId })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div>
                  <div className="h-4 w-24 rounded bg-muted" />
                  <div className="mt-1 h-3 w-16 rounded bg-muted" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Count tasks per member for this project
  const taskCountByUser: Record<string, { total: number; done: number }> = {}
  for (const task of tasks ?? []) {
    if (!task.assignee_id) continue
    if (!taskCountByUser[task.assignee_id]) {
      taskCountByUser[task.assignee_id] = { total: 0, done: 0 }
    }
    taskCountByUser[task.assignee_id].total++
    if (task.status === 'done' || task.status === 'published') {
      taskCountByUser[task.assignee_id].done++
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members?.map((member) => {
        const stats = taskCountByUser[member.user_id]
        return (
          <Card key={member.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                  {member.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{member.display_name}</p>
                  <Badge className={`text-[10px] mt-0.5 ${ROLE_COLORS[member.role] ?? ''}`}>
                    {ROLE_LABELS[member.role as UserRole] ?? member.role}
                  </Badge>
                </div>
              </div>
              {stats ? (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tasks assigned</span>
                    <span className="font-medium">{stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium text-green-600">{stats.done}</span>
                  </div>
                  {stats.total > 0 && (
                    <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all"
                        style={{ width: `${(stats.done / stats.total) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                  No tasks assigned in this project
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
