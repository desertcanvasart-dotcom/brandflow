'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { PieChartIcon, TrendingUp } from 'lucide-react'
import { TASK_STATUS_LABELS } from '@/lib/constants'
import type { TaskStatus } from '@/types/enums'

interface StatusData {
  status: string
  label: string
  count: number
  color: string
}

interface TimeData {
  date: string
  created: number
  completed: number
}

function ChartTooltip({ active, payload, label }: any) {
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

interface TaskStatusChartProps {
  data: StatusData[]
  onDrillDown?: (filter: { status: string; label: string }) => void
}

export function TaskStatusChart({ data, onDrillDown }: TaskStatusChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Task Status Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <PieChartIcon className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No tasks found for this period.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Try expanding the date range or creating tasks in your projects.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleClick = (entry: any) => {
    if (entry?.status && onDrillDown) {
      const label = TASK_STATUS_LABELS[entry.status as TaskStatus] ?? entry.status
      onDrillDown({ status: entry.status, label: `${label} Tasks` })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              dataKey="count"
              nameKey="label"
              onClick={handleClick}
              className="cursor-pointer"
            >
              {data.map((entry) => (
                <Cell key={entry.status} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="bottom"
              formatter={(value: string) => <span className="text-xs">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        <p className="text-center text-sm text-muted-foreground -mt-2">{total} total tasks</p>
      </CardContent>
    </Card>
  )
}

export function TasksOverTimeChart({ data }: { data: TimeData[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tasks Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No task activity in this period.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Select a wider date range to see trends.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Tasks Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
            <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Legend formatter={(value: string) => <span className="text-xs">{value}</span>} />
            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#3B82F6"
              fill="#3B82F6"
              fillOpacity={0.1}
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#22C55E"
              fill="#22C55E"
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
