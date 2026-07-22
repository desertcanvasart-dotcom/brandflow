'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  FunnelChart, Funnel, LabelList,
} from 'recharts'
import { Share2, GitBranch } from 'lucide-react'

interface PlatformData {
  platform: string
  label: string
  count: number
}

interface StatusData {
  status: string
  label: string
  count: number
  color: string
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  tiktok: '#000000',
  youtube: '#FF0000',
  blog: '#F59E0B',
  newsletter: '#8B5CF6',
  other: '#6B7280',
}

function PlatformTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload as PlatformData
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <p className="text-sm font-medium">{data.label}</p>
      <p className="text-xs text-muted-foreground">{data.count} items</p>
    </div>
  )
}

function FunnelTooltip({ active, payload }: any) {
  if (!active || !payload?.[0]) return null
  const data = payload[0].payload as StatusData
  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: data.color }} />
        <p className="text-sm font-medium">{data.label}</p>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{data.count} items</p>
    </div>
  )
}

export function ContentByPlatformChart({ data }: { data: PlatformData[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Content by Platform</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <Share2 className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No content items found.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Create content tasks with platform assignments.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Content by Platform</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<PlatformTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
              {data.map((entry) => (
                <Cell key={entry.platform} fill={PLATFORM_COLORS[entry.platform] ?? '#6B7280'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function ContentByStatusChart({ data }: { data: StatusData[] }) {
  if (data.every((d) => d.count === 0)) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Content Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
            <GitBranch className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No content in the pipeline.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Start creating content to track your pipeline.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Prepare funnel data — sorted from largest to smallest for proper funnel shape
  const funnelData = data
    .filter((d) => d.count > 0)
    .map((d) => ({
      ...d,
      value: d.count,
      fill: d.color,
      name: d.label,
    }))

  // If only 1 stage has data, fall back to bar chart (funnel needs 2+)
  if (funnelData.length < 2) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Content Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<FunnelTooltip />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={40}>
                {data.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Content Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <FunnelChart>
            <Tooltip content={<FunnelTooltip />} />
            <Funnel
              dataKey="value"
              data={funnelData}
              isAnimationActive
            >
              <LabelList
                position="right"
                fill="#374151"
                stroke="none"
                dataKey="name"
                className="text-xs"
              />
              <LabelList
                position="center"
                fill="#fff"
                stroke="none"
                dataKey="value"
                className="text-xs font-semibold"
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {data.map((d) => (
            <div key={d.status} className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
              <span className="text-[11px] text-muted-foreground">{d.label}: {d.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
