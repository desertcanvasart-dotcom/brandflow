'use client'

import { Badge } from '@/components/ui/badge'
import { Target } from 'lucide-react'
import type { StrategyData } from '@/types/kb-forms'

interface StrategyDisplayProps {
  data: StrategyData
}

const OBJECTIVE_COLORS: Record<string, string> = {
  awareness: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  engagement: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  conversion: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  retention: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
}

export function StrategyDisplay({ data }: StrategyDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex items-center gap-2">
          <Badge className={OBJECTIVE_COLORS[data.objectiveType] ?? ''}>
            {data.objectiveType.charAt(0).toUpperCase() + data.objectiveType.slice(1)}
          </Badge>
          {data.targetAudience && (
            <span className="text-sm text-muted-foreground">for {data.targetAudience}</span>
          )}
        </div>
      </div>

      {/* Channels */}
      {data.channels.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Channels</p>
          <div className="flex flex-wrap gap-1">
            {data.channels.map((ch, i) => (
              <Badge key={i} variant="outline" className="font-normal text-xs">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Key Messages */}
      {data.keyMessages.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Messages</p>
          <ul className="list-disc list-inside text-sm space-y-0.5">
            {data.keyMessages.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {/* KPIs */}
      {data.kpis.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">KPIs</p>
          <div className="flex flex-wrap gap-1">
            {data.kpis.map((kpi, i) => (
              <Badge key={i} variant="secondary" className="font-normal text-xs">
                {kpi}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Timeline & Budget */}
      {(data.timeline || data.budget) && (
        <div className="flex gap-4 text-sm">
          {data.timeline && (
            <div>
              <span className="text-xs text-muted-foreground">Timeline: </span>
              <span>{data.timeline}</span>
            </div>
          )}
          {data.budget && (
            <div>
              <span className="text-xs text-muted-foreground">Budget: </span>
              <span>{data.budget}</span>
            </div>
          )}
        </div>
      )}

      {/* Competitive Position */}
      {data.competitivePosition && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Competitive Position</p>
          <p className="text-sm">{data.competitivePosition}</p>
        </div>
      )}

      {/* STAGE_B: Strategy effectiveness tracking metrics */}
    </div>
  )
}
