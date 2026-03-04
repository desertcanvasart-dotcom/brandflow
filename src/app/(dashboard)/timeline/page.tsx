'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { GanttChart } from '@/components/gantt/gantt-chart'

export default function TimelinePage() {
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Month'>('Month')
  const [projectFilter, setProjectFilter] = useState('all')

  const { data: projects, isLoading } = trpc.project.list.useQuery({
    status: 'active',
  })

  return (
    <>
      <TopBar title="Timeline" />
      <div className="flex flex-col gap-5 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Timeline</h2>
            <p className="text-sm text-muted-foreground">
              Visualize tasks across your projects
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg p-0.5 bg-muted/30">
              {(['Day', 'Week', 'Month'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-3 text-xs"
                  onClick={() => setViewMode(mode)}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-muted-foreground">
          {[
            { color: '#3b82f6', label: 'In Progress' },
            { color: '#f59e0b', label: 'In Review' },
            { color: '#a855f7', label: 'Client Review' },
            { color: '#22c55e', label: 'Done' },
            { color: '#ef4444', label: 'Blocked' },
            { color: '#94a3b8', label: 'Other' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 pl-2 border-l">
            <div className="h-3.5 w-0.5 bg-blue-500 rounded-full" />
            <span>Today</span>
          </div>
        </div>

        {/* Chart */}
        {isLoading ? (
          <div className="rounded-xl border bg-white overflow-hidden">
            <div className="h-16 animate-pulse bg-muted/40" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse bg-muted/20 border-t" />
            ))}
          </div>
        ) : (
          <GanttChart
            projects={projects ?? []}
            projectFilter={projectFilter}
            viewMode={viewMode}
          />
        )}
      </div>
    </>
  )
}
