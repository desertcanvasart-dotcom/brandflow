'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { TASK_STATUS_LABELS, TASK_STATUS_COLORS } from '@/lib/constants'
import { CheckCircle2, Clock, AlertCircle, Users, BarChart3 } from 'lucide-react'
import type { Database } from '@/types/database'

type TaskStatus = Database['public']['Enums']['task_status']

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { data: tasks, isLoading } = trpc.task.list.useQuery({ projectId })
  const { data: members } = trpc.member.list.useQuery()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4"><div className="h-16 rounded bg-muted" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const allTasks = tasks ?? []
  const totalTasks = allTasks.length
  const doneTasks = allTasks.filter((t) => t.status === 'done' || t.status === 'published').length
  const inProgressTasks = allTasks.filter((t) => t.status === 'in_progress').length
  const overdueTasks = allTasks.filter((t) => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'published'
  }).length
  const assignedMembers = new Set(allTasks.map((t) => t.assignee_id).filter(Boolean)).size

  // Status breakdown
  const statusCounts: Partial<Record<TaskStatus, number>> = {}
  for (const task of allTasks) {
    statusCounts[task.status] = (statusCounts[task.status] ?? 0) + 1
  }

  const completionPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{completionPercent}%</p>
                <p className="text-xs text-muted-foreground">Completed ({doneTasks}/{totalTasks})</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressTasks}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${overdueTasks > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                <AlertCircle className={`h-5 w-5 ${overdueTasks > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Status breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalTasks > 0 ? (
              <>
                {/* Progress bar */}
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div
                      key={status}
                      className="transition-all"
                      style={{
                        width: `${(count / totalTasks) * 100}%`,
                        backgroundColor: TASK_STATUS_COLORS[status as TaskStatus],
                      }}
                    />
                  ))}
                </div>
                {/* Legend */}
                <div className="space-y-2 mt-4">
                  {Object.entries(statusCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: TASK_STATUS_COLORS[status as TaskStatus] }}
                        />
                        <span className="text-muted-foreground">
                          {TASK_STATUS_LABELS[status as TaskStatus]}
                        </span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No tasks to display</p>
            )}
          </CardContent>
        </Card>

        {/* Team workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Workload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members?.filter((m) => {
              return allTasks.some((t) => t.assignee_id === m.user_id)
            }).map((member) => {
              const memberTasks = allTasks.filter((t) => t.assignee_id === member.user_id)
              const memberDone = memberTasks.filter((t) => t.status === 'done' || t.status === 'published').length
              return (
                <div key={member.id} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {member.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{member.display_name}</span>
                      <span className="text-muted-foreground text-xs">
                        {memberDone}/{memberTasks.length}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: memberTasks.length > 0 ? `${(memberDone / memberTasks.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            {!members?.some((m) => allTasks.some((t) => t.assignee_id === m.user_id)) && (
              <p className="text-sm text-muted-foreground">No tasks assigned yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
