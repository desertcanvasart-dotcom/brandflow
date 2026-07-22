'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/trpc/client'
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, BrainCircuit } from 'lucide-react'

interface AiInsightsProps {
  filters: {
    brandId?: string
    dateRange?: '7d' | '30d' | '90d' | 'year' | 'all'
  }
}

const INSIGHT_ICONS = [TrendingUp, AlertTriangle, Lightbulb, TrendingUp, AlertTriangle]

export function AiInsights({ filters }: AiInsightsProps) {
  const { data, isLoading } = trpc.analytics.insights.useQuery(filters, {
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-amber-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 h-4 w-4 rounded bg-muted animate-pulse" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-full rounded bg-muted animate-pulse" />
                  <div className="h-3.5 w-3/4 rounded bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !data?.insights || data.insights.length === 0 ? (
          <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 text-center">
            <BrainCircuit className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Not enough data to generate insights.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Add more tasks and activity to see AI-powered recommendations.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.insights.map((insight, i) => {
              const Icon = INSIGHT_ICONS[i % INSIGHT_ICONS.length]
              return (
                <li key={i} className="flex items-start gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <p className="text-sm text-muted-foreground leading-relaxed">{insight}</p>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
