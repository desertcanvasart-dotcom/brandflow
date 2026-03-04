'use client'

import { useState } from 'react'
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

type DateRange = '7d' | '30d' | '90d' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  all: 'All time',
}

export default function AnalyticsPage() {
  const [brandId, setBrandId] = useState<string | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange>('30d')

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

        {/* Overview Stats */}
        <OverviewStats
          totalBrands={overview?.totalBrands ?? 0}
          activeProjects={overview?.activeProjects ?? 0}
          tasksCompleted={overview?.tasksCompleted ?? 0}
          overdueTasks={overview?.overdueTasks ?? 0}
          totalTasks={overview?.totalTasks ?? 0}
        />

        {/* Task Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <TaskStatusChart data={tasksByStatus ?? []} />
          <TasksOverTimeChart data={tasksOverTime ?? []} />
        </div>

        {/* Project & Team Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ProjectProgressChart data={projectProgress ?? []} />
          <TeamWorkloadChart data={teamWorkload ?? []} />
        </div>

        {/* Content Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <ContentByPlatformChart data={contentByPlatform ?? []} />
          <ContentByStatusChart data={contentByStatus ?? []} />
        </div>
      </div>
    </>
  )
}
