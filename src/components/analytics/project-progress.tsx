'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { FolderKanban } from 'lucide-react'

interface ProjectData {
  projectId: string
  projectName: string
  brandName: string
  total: number
  completed: number
  percent: number
}

interface ProjectProgressChartProps {
  data: ProjectData[]
  onDrillDown?: (filter: { projectId: string; label: string }) => void
}

function ProjectTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload as ProjectData
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-sm font-medium">{data.projectName}</p>
      {data.brandName && (
        <p className="text-xs text-muted-foreground">{data.brandName}</p>
      )}
      <p className="text-xs text-muted-foreground mt-1">
        {data.completed}/{data.total} tasks ({data.percent}%)
      </p>
    </div>
  )
}

export function ProjectProgressChart({ data, onDrillDown }: ProjectProgressChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <FolderKanban className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No active projects with tasks.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Create a project and add tasks to track progress.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.projectName.length > 20 ? d.projectName.slice(0, 20) + '...' : d.projectName,
  }))

  const chartHeight = Math.max(300, data.length * 50)

  const handleClick = (entry: any) => {
    if (entry?.projectId && onDrillDown) {
      onDrillDown({ projectId: entry.projectId, label: `${entry.projectName} Tasks` })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={140} />
            <Tooltip content={<ProjectTooltip />} />
            <Bar
              dataKey="percent"
              fill="hsl(var(--primary))"
              radius={[0, 4, 4, 0]}
              barSize={24}
              onClick={handleClick}
              className="cursor-pointer"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
