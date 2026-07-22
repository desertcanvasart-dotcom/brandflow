'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Users } from 'lucide-react'

interface TeamData {
  userId: string
  displayName: string
  assigned: number
  completed: number
  inProgress: number
  overdue: number
}

interface TeamWorkloadChartProps {
  data: TeamData[]
  onDrillDown?: (filter: { assigneeId: string; label: string }) => void
}

function TeamTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-sm font-medium">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-muted-foreground">
          <span style={{ color: entry.color }}>{entry.name}</span>: {entry.value}
        </p>
      ))}
    </div>
  )
}

export function TeamWorkloadChart({ data, onDrillDown }: TeamWorkloadChartProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Team Workload</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <Users className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No task assignments found.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Assign tasks to team members to see workload distribution.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    name: d.displayName.length > 12 ? d.displayName.slice(0, 12) + '...' : d.displayName,
  }))

  const handleClick = (entry: any) => {
    if (entry?.userId && onDrillDown) {
      onDrillDown({ assigneeId: entry.userId, label: `${entry.displayName}'s Tasks` })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Team Workload</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<TeamTooltip />} />
            <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
            <Bar dataKey="inProgress" name="In Progress" fill="#3B82F6" radius={[2, 2, 0, 0]} onClick={handleClick} className="cursor-pointer" />
            <Bar dataKey="completed" name="Completed" fill="#22C55E" radius={[2, 2, 0, 0]} onClick={handleClick} className="cursor-pointer" />
            <Bar dataKey="overdue" name="Overdue" fill="#EF4444" radius={[2, 2, 0, 0]} onClick={handleClick} className="cursor-pointer" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
