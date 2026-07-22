'use client'

import { useMemo, useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  AvatarGroup,
  AvatarGroupCount,
} from '@/components/ui/avatar'
import {
  Plus,
  Search,
  Calendar,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  ListChecks,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { PROJECT_TYPE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

// ─── Status badge colors ──────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  active: 'bg-green-100 text-green-700',
  paused: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
}

// ─── Health indicator ─────────────────────────────────
type HealthStatus = 'green' | 'yellow' | 'red'

function calculateHealth(
  stats: { total: number; overdue: number; percent: number },
  endDate: string | null
): HealthStatus {
  const now = new Date().toISOString()
  if (stats.total > 0 && stats.overdue / stats.total > 0.2) return 'red'
  if (endDate && endDate < now && stats.percent < 100) return 'red'
  if (stats.overdue > 0) return 'yellow'
  return 'green'
}

const HEALTH_DOT: Record<HealthStatus, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
}

const HEALTH_LABELS: Record<HealthStatus, string> = {
  green: 'On Track',
  yellow: 'At Risk',
  red: 'Off Track',
}

// ─── Sort type ────────────────────────────────────────
type SortOption = 'updated' | 'dueDate' | 'progress' | 'client'

// ─── Default empty stats ──────────────────────────────
const EMPTY_STATS = {
  projectId: '',
  total: 0,
  completed: 0,
  inProgress: 0,
  overdue: 0,
  percent: 0,
  teamMembers: [] as { userId: string; displayName: string; avatarUrl: string | null }[],
  totalAssignees: 0,
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const debouncedSearch = useDebounce(search, 300)

  // ─── Two parallel queries ──────────────────────────
  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery({
    search: debouncedSearch || undefined,
    type: typeFilter === 'all' ? undefined : (typeFilter as 'content_ops' | 'web_build' | 'full_service'),
    status: statusFilter === 'all' ? undefined : (statusFilter as 'draft' | 'active' | 'paused' | 'completed' | 'archived'),
  })

  const { data: stats, isLoading: statsLoading } = trpc.project.listStats.useQuery()

  const isLoading = projectsLoading || statsLoading

  // ─── Merge stats into projects ─────────────────────
  const statsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof stats>[number]>()
    for (const s of stats ?? []) map.set(s.projectId, s)
    return map
  }, [stats])

  const enrichedProjects = useMemo(() => {
    if (!projects) return []

    const merged = projects.map((project) => ({
      ...project,
      stats: statsMap.get(project.id) ?? { ...EMPTY_STATS, projectId: project.id },
    }))

    switch (sortBy) {
      case 'dueDate':
        return [...merged].sort((a, b) => {
          if (!a.end_date && !b.end_date) return 0
          if (!a.end_date) return 1
          if (!b.end_date) return -1
          return a.end_date.localeCompare(b.end_date)
        })
      case 'progress':
        return [...merged].sort((a, b) => b.stats.percent - a.stats.percent)
      case 'client':
        return [...merged].sort((a, b) =>
          (a.brands?.name ?? '').localeCompare(b.brands?.name ?? '')
        )
      default:
        return merged // already sorted by updated_at desc
    }
  }, [projects, statsMap, sortBy])

  // ─── Summary stats ─────────────────────────────────
  const summary = useMemo(() => {
    if (!projects) return { active: 0, completed: 0, withOverdue: 0, total: 0 }
    return {
      active: projects.filter((p) => p.status === 'active').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      withOverdue: enrichedProjects.filter((p) => p.stats.overdue > 0).length,
      total: projects.length,
    }
  }, [projects, enrichedProjects])

  return (
    <TooltipProvider>
      <TopBar title="Projects" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Projects</h2>
            <p className="text-muted-foreground">
              Manage your content operations and web projects
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Link>
          </Button>
        </div>

        {/* ─── Summary Stats ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <FolderKanban className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <CheckCircle2 className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.completed}</p>
                  <p className="text-xs text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                    summary.withOverdue > 0 ? 'bg-red-50' : 'bg-gray-50'
                  }`}
                >
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      summary.withOverdue > 0 ? 'text-red-600' : 'text-gray-400'
                    }`}
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.withOverdue}</p>
                  <p className="text-xs text-muted-foreground">With Overdue</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                  <BarChart3 className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Filters + Sort ─── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Project type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="content_ops">Content Operations</SelectItem>
              <SelectItem value="web_build">Web Build</SelectItem>
              <SelectItem value="full_service">Full Service</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="progress">Progress</SelectItem>
              <SelectItem value="client">Client Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ─── Project List ─── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 w-48 rounded bg-muted" />
                      <div className="h-3 w-32 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-muted" />
                  <div className="mt-3 flex gap-1">
                    <div className="h-6 w-6 rounded-full bg-muted" />
                    <div className="h-6 w-6 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : enrichedProjects.length > 0 ? (
          <div className="space-y-3">
            {enrichedProjects.map((project) => {
              const health = calculateHealth(project.stats, project.end_date)
              const progressColor =
                health === 'red'
                  ? 'bg-red-500'
                  : health === 'yellow'
                  ? 'bg-yellow-500'
                  : 'bg-primary'

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="transition-all hover:bg-accent/50 hover:shadow-md">
                    <CardContent className="p-5">
                      {/* Row 1: Brand avatar, name, badges, health */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {project.brands?.logo_url ? (
                            <img
                              src={project.brands.logo_url}
                              alt={project.brands.name}
                              className="h-10 w-10 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary text-sm font-bold shrink-0">
                              {project.brands?.name?.charAt(0) ?? 'P'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{project.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="truncate">{project.brands?.name}</span>
                              {project.end_date && (
                                <>
                                  <span>&middot;</span>
                                  <span className="flex items-center gap-1 shrink-0">
                                    <Calendar className="h-3 w-3" />
                                    {formatDate(project.end_date)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {PROJECT_TYPE_LABELS[project.type]}
                          </Badge>
                          <Badge className={`text-xs ${STATUS_COLORS[project.status] ?? ''}`}>
                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                          </Badge>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${HEALTH_DOT[health]}`}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{HEALTH_LABELS[health]}</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* Row 2: Progress bar + task stats */}
                      <div className="mt-4">
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full ${progressColor} transition-all`}
                            style={{ width: `${project.stats.percent}%` }}
                          />
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ListChecks className="h-3 w-3" />
                            {project.stats.completed}/{project.stats.total} tasks
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {project.stats.percent}%
                          </span>
                          {project.stats.overdue > 0 && (
                            <span className="text-xs text-red-500 font-medium">
                              {project.stats.overdue} overdue
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 3: Team avatars */}
                      {project.stats.totalAssignees > 0 && (
                        <div className="mt-3">
                          <AvatarGroup>
                            {project.stats.teamMembers.map((member) => (
                              <Tooltip key={member.userId}>
                                <TooltipTrigger asChild>
                                  <Avatar size="sm">
                                    {member.avatarUrl && (
                                      <AvatarImage src={member.avatarUrl} />
                                    )}
                                    <AvatarFallback>
                                      {member.displayName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{member.displayName}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                            {project.stats.totalAssignees > 3 && (
                              <AvatarGroupCount>
                                <span className="text-[10px]">
                                  +{project.stats.totalAssignees - 3}
                                </span>
                              </AvatarGroupCount>
                            )}
                          </AvatarGroup>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        ) : (
          /* ─── Empty State ─── */
          <div className="flex items-center justify-center rounded-xl border border-dashed p-16">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <FolderKanban className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No projects yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Create your first project to start managing campaigns, websites,
                and marketing tasks for your clients.
              </p>
              <Button asChild className="mt-4">
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Project
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
