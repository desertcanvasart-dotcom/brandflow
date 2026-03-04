'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Palette, FolderKanban, CheckCircle2, AlertCircle } from 'lucide-react'

interface OverviewStatsProps {
  totalBrands: number
  activeProjects: number
  tasksCompleted: number
  overdueTasks: number
  totalTasks: number
}

export function OverviewStats({ totalBrands, activeProjects, tasksCompleted, overdueTasks, totalTasks }: OverviewStatsProps) {
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
              <p className="text-2xl font-bold">{activeProjects}</p>
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
              <p className="text-2xl font-bold">
                {tasksCompleted}
                <span className="text-sm font-normal text-muted-foreground">/{totalTasks}</span>
              </p>
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
              <p className="text-2xl font-bold">{overdueTasks}</p>
              <p className="text-xs text-muted-foreground">Overdue Tasks</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
