'use client'

import { useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { OverviewStats } from '@/components/analytics/overview-stats'
import { TaskStatusChart, TasksOverTimeChart } from '@/components/analytics/task-charts'
import { ProjectProgressChart } from '@/components/analytics/project-progress'
import { TeamWorkloadChart } from '@/components/analytics/team-workload'
import { ContentByPlatformChart, ContentByStatusChart } from '@/components/analytics/content-pipeline'
import { AiInsights } from '@/components/analytics/ai-insights'
import { DateComparison } from '@/components/analytics/date-comparison'
import { DrillDownSheet } from '@/components/analytics/drill-down-sheet'

type DateRange = '7d' | '30d' | '90d' | 'year' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  year: 'Last year',
  all: 'All time',
}

interface DrillDownFilter {
  status?: string
  assigneeId?: string
  projectId?: string
  label: string
}

export default function AnalyticsPage() {
  const [brandId, setBrandId] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

  // Drill-down state
  const [drillDown, setDrillDown] = useState<DrillDownFilter | null>(null)
  const [drillDownOpen, setDrillDownOpen] = useState(false)

  const openDrillDown = useCallback((filter: DrillDownFilter) => {
    setDrillDown(filter)
    setDrillDownOpen(true)
  }, [])

  const filters = { brandId, dateRange }

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: overview } = trpc.analytics.overview.useQuery(filters)
  const { data: tasksByStatus } = trpc.analytics.tasksByStatus.useQuery(filters)
  const { data: tasksOverTime } = trpc.analytics.tasksOverTime.useQuery(filters)
  const { data: projectProgress } = trpc.analytics.projectProgress.useQuery(filters)
  const { data: teamWorkload } = trpc.analytics.teamWorkload.useQuery(filters)
  const { data: contentByPlatform } = trpc.analytics.contentByPlatform.useQuery(filters)
  const { data: contentByStatus } = trpc.analytics.contentByStatus.useQuery(filters)

  return (
    <>
      <TopBar title="Analytics" />
      <div className="flex flex-col gap-6 p-6">
        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={brandId ?? 'all'}
            onValueChange={(v) => setBrandId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={dateRange}
            onValueChange={(v) => setDateRange(v as DateRange)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Overview */}
        <OverviewStats
          totalBrands={overview?.totalBrands ?? 0}
          activeProjects={overview?.activeProjects ?? 0}
          tasksCompleted={overview?.tasksCompleted ?? 0}
          overdueTasks={overview?.overdueTasks ?? 0}
          totalTasks={overview?.totalTasks ?? 0}
          prevTasksCompleted={overview?.prevTasksCompleted}
          prevOverdueTasks={overview?.prevOverdueTasks}
          prevActiveProjects={overview?.prevActiveProjects}
        />

        {/* Task Analytics Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Task Analytics
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <TasksOverTimeChart data={tasksOverTime ?? []} />
            <TeamWorkloadChart
              data={teamWorkload ?? []}
              onDrillDown={(f) => openDrillDown({ assigneeId: f.assigneeId, label: f.label })}
            />
          </div>
        </div>

        {/* Project & Status Section */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Projects & Status
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <TaskStatusChart
              data={tasksByStatus ?? []}
              onDrillDown={(f) => openDrillDown({ status: f.status, label: f.label })}
            />
            <ProjectProgressChart
              data={projectProgress ?? []}
              onDrillDown={(f) => openDrillDown({ projectId: f.projectId, label: f.label })}
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content Pipeline
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <ContentByPlatformChart data={contentByPlatform ?? []} />
            <ContentByStatusChart data={contentByStatus ?? []} />
          </div>
        </div>

        {/* Intelligence Section */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Intelligence
          </h3>
          <div className="grid gap-6 lg:grid-cols-2">
            <AiInsights filters={filters} />
            <DateComparison brandId={brandId} />
          </div>
        </div>
      </div>

      {/* Drill-down Sheet */}
      <DrillDownSheet
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
        filter={drillDown}
        brandId={brandId}
      />
    </>
  )
}
