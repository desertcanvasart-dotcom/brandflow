'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface ProjectData {
  projectId: string
  projectName: string
  brandName: string
  total: number
  completed: number
  percent: number
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

export function ProjectProgressChart({ data }: { data: ProjectData[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Project Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-muted-foreground">No active projects</p>
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
            <Bar dataKey="percent" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
