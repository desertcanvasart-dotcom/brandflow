'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { ArrowLeftRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'

type DateRange = '7d' | '30d' | '90d' | 'year' | 'all'

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  year: 'Last year',
  all: 'All time',
}

interface DateComparisonProps {
  brandId?: string
}

function DiffIndicator({ a, b, invertColors }: { a: number; b: number; invertColors?: boolean }) {
  if (a === b) {
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
  }
  const diff = a - b
  const pct = b > 0 ? Math.round((diff / b) * 100) : a > 0 ? 100 : 0
  const isUp = diff > 0
  const isGood = invertColors ? !isUp : isUp

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? 'text-emerald-600' : 'text-red-500'}`}>
      {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {isUp ? '+' : ''}{pct}%
    </span>
  )
}

export function DateComparison({ brandId }: DateComparisonProps) {
  const [rangeA, setRangeA] = useState<DateRange>('30d')
  const [rangeB, setRangeB] = useState<DateRange>('90d')

  const { data, isLoading } = trpc.analytics.compareOverview.useQuery({
    brandId,
    rangeA,
    rangeB,
  })

  const metrics = [
    { label: 'Tasks Created', keyA: data?.a.tasksCreated ?? 0, keyB: data?.b.tasksCreated ?? 0 },
    { label: 'Tasks Completed', keyA: data?.a.tasksCompleted ?? 0, keyB: data?.b.tasksCompleted ?? 0 },
    { label: 'Overdue Tasks', keyA: data?.a.overdueTasks ?? 0, keyB: data?.b.overdueTasks ?? 0, invertColors: true },
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          Compare Periods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Range selectors */}
        <div className="flex items-center gap-2">
          <Select value={rangeA} onValueChange={(v) => setRangeA(v as DateRange)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-xs text-muted-foreground font-medium">vs</span>

          <Select value={rangeB} onValueChange={(v) => setRangeB(v as DateRange)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DATE_RANGE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Comparison table */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-8 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 border-b bg-muted/30 px-3 py-2">
              <div className="text-[11px] font-medium text-muted-foreground">Metric</div>
              <div className="text-[11px] font-medium text-muted-foreground text-right">
                {DATE_RANGE_LABELS[rangeA]}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground text-right">
                {DATE_RANGE_LABELS[rangeB]}
              </div>
              <div className="text-[11px] font-medium text-muted-foreground text-right">Change</div>
            </div>

            {/* Rows */}
            {metrics.map((m) => (
              <div key={m.label} className="grid grid-cols-4 gap-2 border-b last:border-0 px-3 py-2.5">
                <div className="text-xs font-medium">{m.label}</div>
                <div className="text-xs text-right tabular-nums font-semibold">{m.keyA}</div>
                <div className="text-xs text-right tabular-nums text-muted-foreground">{m.keyB}</div>
                <div className="flex justify-end">
                  <DiffIndicator a={m.keyA} b={m.keyB} invertColors={m.invertColors} />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
