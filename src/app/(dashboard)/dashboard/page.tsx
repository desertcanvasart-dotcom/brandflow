'use client'

import { useMemo } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  PROJECT_TYPE_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
  MEETING_TYPE_LABELS,
} from '@/lib/constants'
import {
  Palette,
  FolderKanban,
  CalendarCheck,
  AlertCircle,
  Users,
  ArrowRight,
  Video,
  Calendar,
  Clock,
  CheckCircle2,
  CircleDot,
  Eye,
} from 'lucide-react'
import Link from 'next/link'
import { ActivityFeed } from '@/components/activity/activity-feed'
import { isToday, addDays, format, startOfDay, isBefore, parseISO } from 'date-fns'
import type { Database } from '@/types/database'
import type { MeetingType } from '@/types/enums'

type TaskStatus = Database['public']['Enums']['task_status']

// ─── Greeting helper ──────────────────────────────────
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// ─── Stat Card ────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  href,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  iconBg: string
  iconColor: string
  href?: string
}) {
  const content = (
    <Card className={href ? 'transition-colors hover:border-primary/30' : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
  if (href) return <Link href={href}>{content}</Link>
  return content
}

export default function DashboardPage() {
  const { user } = useCurrentUser()
  const firstName = user?.user_metadata?.display_name?.split(' ')[0] ??
    user?.email?.split('@')[0] ?? 'there'

  // ─── Data queries ──────────────────────────────────
  const { data: overview } = trpc.analytics.overview.useQuery({ dateRange: 'all' })
  const { data: projects } = trpc.project.list.useQuery({ status: 'active' })
  const { data: members } = trpc.member.list.useQuery()
  const { data: teamWorkload } = trpc.analytics.teamWorkload.useQuery({ dateRange: 'all' })
  const { data: projectProgress } = trpc.analytics.projectProgress.useQuery({ dateRange: 'all' })
  const { data: upcomingMeetings } = trpc.meeting.upcoming.useQuery()

  // Tasks for today + approvals
  const projectIds = projects?.map((p) => p.id) ?? []
  const { data: allTasks } = trpc.task.listForTimeline.useQuery(
    { projectIds },
    { enabled: projectIds.length > 0 }
  )

  // Upcoming deadlines (next 7 days)
  const todayStr = startOfDay(new Date()).toISOString()
  const weekLaterStr = addDays(startOfDay(new Date()), 7).toISOString()
  const { data: deadlineTasks } = trpc.calendar.getTasksByRange.useQuery({
    startDate: todayStr,
    endDate: weekLaterStr,
  })

  // ─── Derived data ─────────────────────────────────
  const tasks = allTasks ?? []

  const tasksDueToday = useMemo(
    () =>
      tasks.filter(
        (t) =>
          t.due_date &&
          isToday(parseISO(t.due_date)) &&
          t.status !== 'done' &&
          t.status !== 'published'
      ),
    [tasks]
  )

  const pendingApprovals = useMemo(
    () =>
      tasks.filter(
        (t) => t.status === 'in_review' || t.status === 'client_review'
      ),
    [tasks]
  )

  // Group deadlines by date
  type DeadlineTask = NonNullable<typeof deadlineTasks>[number]
  const deadlinesByDate = useMemo(() => {
    const map = new Map<string, DeadlineTask[]>()
    if (!deadlineTasks) return map
    const sorted = [...deadlineTasks]
      .filter((t) => t.status !== 'done' && t.status !== 'published')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    for (const task of sorted) {
      const dateKey = format(parseISO(task.due_date!), 'yyyy-MM-dd')
      const existing = map.get(dateKey) ?? []
      existing.push(task)
      map.set(dateKey, existing)
    }
    return map
  }, [deadlineTasks])

  // Max assigned for workload bar scaling
  const maxAssigned = useMemo(
    () => Math.max(1, ...(teamWorkload?.map((m) => m.assigned) ?? [1])),
    [teamWorkload]
  )

  return (
    <>
      <TopBar title="Dashboard" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── 1. Greeting Banner ─── */}
        <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {tasksDueToday.length > 0
              ? `${tasksDueToday.length} task${tasksDueToday.length !== 1 ? 's' : ''} due today`
              : 'No tasks due today'}
            {(overview?.overdueTasks ?? 0) > 0 &&
              ` · ${overview!.overdueTasks} overdue`}
            {' · '}
            {overview?.activeProjects ?? 0} active project
            {(overview?.activeProjects ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ─── 2. KPI Stats Grid ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            icon={Palette}
            label="Active Clients"
            value={overview?.totalBrands ?? 0}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
            href="/brands"
          />
          <StatCard
            icon={FolderKanban}
            label="Active Projects"
            value={overview?.activeProjects ?? 0}
            iconBg="bg-indigo-50"
            iconColor="text-indigo-600"
            href="/projects"
          />
          <StatCard
            icon={CalendarCheck}
            label="Tasks Due Today"
            value={tasksDueToday.length}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            icon={AlertCircle}
            label="Overdue Tasks"
            value={overview?.overdueTasks ?? 0}
            iconBg={(overview?.overdueTasks ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50'}
            iconColor={(overview?.overdueTasks ?? 0) > 0 ? 'text-red-600' : 'text-gray-400'}
          />
          <StatCard
            icon={Users}
            label="Team Members"
            value={members?.length ?? 0}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
            href="/team"
          />
        </div>

        {/* ─── 3 & 4. Today's Tasks + Pending Approvals ─── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-amber-500" />
                  Today&apos;s Tasks
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {tasksDueToday.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {tasksDueToday.length > 0 ? (
                tasksDueToday.slice(0, 8).map((task) => (
                  <Link
                    key={task.id}
                    href={`/projects/${task.project_id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-accent/50 transition-colors"
                  >
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
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Nothing due today — great work!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4 text-purple-500" />
                  Pending Approvals
                </CardTitle>
                <Badge variant="secondary" className="text-[10px]">
                  {pendingApprovals.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.slice(0, 8).map((task) => (
                  <Link
                    key={task.id}
                    href={`/projects/${task.project_id}`}
                    className="flex items-center justify-between py-2 px-2 -mx-2 rounded hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <CircleDot
                        className={`h-3.5 w-3.5 shrink-0 ${
                          task.status === 'client_review'
                            ? 'text-purple-500'
                            : 'text-amber-500'
                        }`}
                      />
                      <span className="text-sm truncate">{task.title}</span>
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ml-2 ${
                        task.status === 'client_review'
                          ? 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                          : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                      }`}
                    >
                      {task.status === 'client_review'
                        ? 'Client Review'
                        : 'Internal Review'}
                    </Badge>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No pending approvals
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── 5. Active Projects ─── */}
        {projectProgress && projectProgress.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Active Projects
                </CardTitle>
                <Link
                  href="/projects"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {projectProgress.map((project) => (
                  <Link
                    key={project.projectId}
                    href={`/projects/${project.projectId}`}
                    className="block"
                  >
                    <div className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/30 hover:bg-accent/30">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary shrink-0">
                        {project.brandName?.charAt(0)?.toUpperCase() ?? 'P'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium truncate">
                            {project.projectName}
                          </span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {project.percent}%
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {project.brandName}
                        </p>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${project.percent}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {project.completed}/{project.total} tasks
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── 6 & 7. Upcoming Deadlines + Team Workload ─── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Upcoming Deadlines
                </CardTitle>
                <Link
                  href="/calendar"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Calendar <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {deadlinesByDate.size > 0 ? (
                <div className="space-y-4">
                  {Array.from(deadlinesByDate.entries())
                    .slice(0, 5)
                    .map(([dateKey, dateTasks]) => {
                      const date = parseISO(dateKey)
                      const isOverdue = isBefore(date, startOfDay(new Date()))
                      const isTodayDate = isToday(date)

                      return (
                        <div key={dateKey}>
                          <p
                            className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${
                              isOverdue
                                ? 'text-red-500'
                                : isTodayDate
                                ? 'text-amber-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {isTodayDate
                              ? 'Today'
                              : format(date, 'EEE, MMM d')}
                          </p>
                          {dateTasks.slice(0, 4).map((task) => (
                            <Link
                              key={task.id}
                              href={`/projects/${task.project_id}`}
                              className="flex items-center justify-between py-1.5 px-2 -mx-2 rounded hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{
                                    backgroundColor:
                                      TASK_STATUS_COLORS[task.status as TaskStatus],
                                  }}
                                />
                                <span className="text-sm truncate">
                                  {task.title}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                                {(task as any).projects?.name ?? ''}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No upcoming deadlines this week
                </p>
              )}
            </CardContent>
          </Card>

          {/* Team Workload */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Workload
                </CardTitle>
                <Link
                  href="/team"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  Manage <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {teamWorkload && teamWorkload.length > 0 ? (
                <div className="space-y-4">
                  {teamWorkload.map((member) => {
                    const barPercent = Math.round(
                      (member.assigned / maxAssigned) * 100
                    )
                    const barColor =
                      member.overdue >= 3
                        ? 'bg-red-500'
                        : member.overdue >= 1
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'

                    return (
                      <div key={member.userId}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                              {member.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-sm font-medium">
                              {member.displayName}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {member.assigned} tasks
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor} transition-all`}
                            style={{ width: `${barPercent}%` }}
                          />
                        </div>
                        <div className="flex gap-3 mt-1">
                          <span className="text-[10px] text-muted-foreground">
                            {member.inProgress} in progress
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {member.completed} done
                          </span>
                          {member.overdue > 0 && (
                            <span className="text-[10px] text-red-500 font-medium">
                              {member.overdue} overdue
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No task assignments yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── 8. Upcoming Meetings ─── */}
        {upcomingMeetings && upcomingMeetings.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Upcoming Meetings
                </CardTitle>
                <Link
                  href="/meetings"
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingMeetings.map((meeting: any) => (
                  <Link
                    key={meeting.id}
                    href={`/meetings/${meeting.id}`}
                    className="block"
                  >
                    <div className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {meeting.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {meeting.scheduled_at
                              ? new Date(
                                  meeting.scheduled_at
                                ).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })
                              : 'TBD'}
                          </span>
                        </div>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px]"
                        >
                          {MEETING_TYPE_LABELS[
                            meeting.meeting_type as MeetingType
                          ] || meeting.meeting_type}
                        </Badge>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── 9. Recent Activity ─── */}
        <ActivityFeed />
      </div>
    </>
  )
}
