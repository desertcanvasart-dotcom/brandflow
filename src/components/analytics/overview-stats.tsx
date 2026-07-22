'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Palette, FolderKanban, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface OverviewStatsProps {
  totalBrands: number
  activeProjects: number
  tasksCompleted: number
  overdueTasks: number
  totalTasks: number
  prevTasksCompleted?: number
  prevOverdueTasks?: number
  prevActiveProjects?: number
}

function TrendBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === 0) {
    if (current > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
          <TrendingUp className="h-3 w-3" />
          New
        </span>
      )
    }
    return null
  }

  const change = Math.round(((current - previous) / previous) * 100)

  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    )
  }

  const isPositive = change > 0

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {isPositive ? '+' : ''}{change}%
    </span>
  )
}

function OverdueTrendBadge({ current, previous }: { current: number; previous: number | undefined }) {
  if (previous === undefined || previous === 0) {
    if (current > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-red-500">
          <TrendingUp className="h-3 w-3" />
          New
        </span>
      )
    }
    return null
  }

  const change = Math.round(((current - previous) / previous) * 100)

  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
        <Minus className="h-3 w-3" />
        0%
      </span>
    )
  }

  // For overdue, going down is good (green), going up is bad (red)
  const isPositive = change < 0

  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {change > 0 ? '+' : ''}{change}%
    </span>
  )
}

export function OverviewStats({
  totalBrands,
  activeProjects,
  tasksCompleted,
  overdueTasks,
  totalTasks,
  prevTasksCompleted,
  prevOverdueTasks,
  prevActiveProjects,
}: OverviewStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
              <Palette className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBrands}</p>
              <p className="text-xs text-muted-foreground">Total Brands</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{activeProjects}</p>
                <TrendBadge current={activeProjects} previous={prevActiveProjects} />
              </div>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">
                  {tasksCompleted}
                  <span className="text-sm font-normal text-muted-foreground">/{totalTasks}</span>
                </p>
                <TrendBadge current={tasksCompleted} previous={prevTasksCompleted} />
              </div>
              <p className="text-xs text-muted-foreground">Tasks Completed</p>
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
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{overdueTasks}</p>
                <OverdueTrendBadge current={overdueTasks} previous={prevOverdueTasks} />
              </div>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
