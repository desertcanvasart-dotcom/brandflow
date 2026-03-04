'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { PROJECT_TYPE_LABELS, TASK_STATUS_LABELS, TASK_STATUS_COLORS, MEETING_TYPE_LABELS } from '@/lib/constants'
import { FolderKanban, CheckCircle2, Clock, Users, AlertCircle, ArrowRight, Video, Calendar } from 'lucide-react'
import Link from 'next/link'
import { ActivityFeed } from '@/components/activity/activity-feed'
import type { Database } from '@/types/database'
import type { MeetingType } from '@/types/enums'

type TaskStatus = Database['public']['Enums']['task_status']

function DigitalClock() {
  const [time, setTime] = useState<Date | null>(null)

  useEffect(() => {
    setTime(new Date())
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!time) return <div className="h-20" />

  const hours = time.getHours()
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12

  const dateStr = time.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col items-center justify-center py-6">
      <div className="flex items-baseline gap-1 tabular-nums">
        <span className="text-5xl font-bold tracking-tight">{displayHours}</span>
        <span className="text-5xl font-bold tracking-tight animate-pulse">:</span>
        <span className="text-5xl font-bold tracking-tight">{minutes}</span>
        <span className="text-2xl font-medium text-muted-foreground ml-1">{seconds}</span>
        <span className="text-lg font-medium text-muted-foreground ml-1">{ampm}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{dateStr}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: projects } = trpc.project.list.useQuery({ status: 'active' })
  const { data: members } = trpc.member.list.useQuery()
  const { data: upcomingMeetings } = trpc.meeting.upcoming.useQuery()

  // Collect project IDs for task fetching
  const projectIds = projects?.map((p) => p.id) ?? []
  const { data: allTasks } = trpc.task.listForTimeline.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  const tasks = allTasks ?? []
  const totalProjects = projects?.length ?? 0
  const totalMembers = members?.length ?? 0
  const totalTasks = tasks.length
  const doneTasks = tasks.filter((t) => t.status === 'done' || t.status === 'published').length
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length
  const overdueTasks = tasks.filter((t) => {
    if (!t.due_date) return false
    return new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'published'
  }).length

  // Recent tasks (last 5 updated)
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 6)

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex flex-col gap-6 p-6">
        {/* Clock */}
        <Card>
          <CardContent className="p-0">
            <DigitalClock />
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <FolderKanban className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalProjects}</p>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
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
                  <p className="text-2xl font-bold">{doneTasks}<span className="text-sm font-normal text-muted-foreground">/{totalTasks}</span></p>
                  <p className="text-xs text-muted-foreground">Tasks Completed</p>
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
          {/* Recent Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Recent Tasks</CardTitle>
                <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentTasks.length > 0 ? recentTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: TASK_STATUS_COLORS[task.status as TaskStatus] }}
                    />
                    <span className="text-sm truncate">{task.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                    {TASK_STATUS_LABELS[task.status as TaskStatus]}
                  </Badge>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No tasks yet</p>
              )}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                <Link href="/projects" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {projects && projects.length > 0 ? projects.slice(0, 6).map((project) => {
                const projectTasks = tasks.filter((t) => t.project_id === project.id)
                const projectDone = projectTasks.filter((t) => t.status === 'done' || t.status === 'published').length
                const percent = projectTasks.length > 0 ? Math.round((projectDone / projectTasks.length) * 100) : 0

                return (
                  <Link key={project.id} href={`/projects/${project.id}`} className="block">
                    <div className="flex items-center gap-3 py-1.5 hover:bg-accent/50 rounded -mx-2 px-2 transition-colors">
                      <div className="flex h-7 w-7 items-center justify-center rounded bg-primary/10 text-[10px] font-bold text-primary shrink-0">
                        {project.brands?.name?.charAt(0) ?? 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{project.name}</span>
                          <span className="text-[10px] text-muted-foreground ml-2">{percent}%</span>
                        </div>
                        <div className="mt-1 h-1 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {PROJECT_TYPE_LABELS[project.type]}
                      </Badge>
                    </div>
                  </Link>
                )
              }) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No active projects</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Meetings */}
        {upcomingMeetings && upcomingMeetings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Upcoming Meetings
                </CardTitle>
                <Link href="/meetings" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting: any) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block">
                    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{meeting.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {meeting.scheduled_at
                              ? new Date(meeting.scheduled_at).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'TBD'}
                          </span>
                        </div>
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          {MEETING_TYPE_LABELS[meeting.meeting_type as MeetingType] || meeting.meeting_type}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <ActivityFeed />

        {/* Team Summary */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Team ({totalMembers})
              </CardTitle>
              <Link href="/team" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                Manage <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {members?.map((member) => {
                const memberTasks = tasks.filter((t) => t.assignee_id === member.user_id)
                return (
                  <div key={member.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {member.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <span className="text-xs font-medium">{member.display_name}</span>
                    {memberTasks.length > 0 && (
                      <span className="text-[10px] text-muted-foreground">{memberTasks.length} tasks</span>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
