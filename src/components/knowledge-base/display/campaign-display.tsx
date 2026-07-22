'use client'

import { Badge } from '@/components/ui/badge'
import { Megaphone, Calendar } from 'lucide-react'
import type { CampaignData } from '@/types/kb-forms'

interface CampaignDisplayProps {
  data: CampaignData
}

const RATING_LABELS: Record<string, { label: string; color: string }> = {
  poor: { label: '⭐ Poor', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400' },
  fair: { label: '⭐⭐ Fair', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400' },
  good: { label: '⭐⭐⭐ Good', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' },
  great: { label: '⭐⭐⭐⭐ Great', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' },
  excellent: { label: '⭐⭐⭐⭐⭐ Excellent', color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' },
}

export function CampaignDisplay({ data }: CampaignDisplayProps) {
  const ratingInfo = RATING_LABELS[data.overallRating]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30">
          <Megaphone className="h-5 w-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{data.campaignName || 'Unnamed Campaign'}</h4>
            {ratingInfo && (
              <Badge className={ratingInfo.color}>{ratingInfo.label}</Badge>
            )}
          </div>
          {data.objective && (
            <p className="text-sm text-muted-foreground">{data.objective}</p>
          )}
        </div>
      </div>

      {/* Date Range */}
      {(data.startDate || data.endDate) && (
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span>
            {data.startDate && new Date(data.startDate).toLocaleDateString()}
            {data.startDate && data.endDate && ' — '}
            {data.endDate && new Date(data.endDate).toLocaleDateString()}
          </span>
        </div>
      )}

      {/* Target Audience & Budget */}
      {(data.targetAudience || data.budget) && (
        <div className="flex gap-4 text-sm">
          {data.targetAudience && (
            <div>
              <span className="text-xs text-muted-foreground">Audience: </span>
              <span>{data.targetAudience}</span>
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

      {/* Deliverables */}
      {data.deliverables.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Deliverables</p>
          <div className="flex flex-wrap gap-1">
            {data.deliverables.map((d, i) => (
              <Badge key={i} variant="secondary" className="font-normal text-xs">
                {d}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Success Metrics */}
      {data.successMetrics.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Success Metrics</p>
          <div className="flex flex-wrap gap-1">
            {data.successMetrics.map((m, i) => (
              <Badge key={i} variant="secondary" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 font-normal text-xs">
                {m}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* STAGE_B: Campaign performance results tracking */}
    </div>
  )
}
