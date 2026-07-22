'use client'

import { Badge } from '@/components/ui/badge'
import { Swords, ExternalLink } from 'lucide-react'
import type { CompetitorData } from '@/types/kb-forms'

interface CompetitorDisplayProps {
  data: CompetitorData
}

const THREAT_COLORS: Record<string, string> = {
  low: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  medium: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  high: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
}

export function CompetitorDisplay({ data }: CompetitorDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
          <Swords className="h-5 w-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-medium">{data.companyName || 'Unnamed Competitor'}</h4>
            <Badge className={THREAT_COLORS[data.threatLevel] ?? ''}>
              {data.threatLevel.charAt(0).toUpperCase() + data.threatLevel.slice(1)} Threat
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {data.industry && <span>{data.industry}</span>}
            {data.website && (
              <>
                <span>·</span>
                <a
                  href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Website <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
            {data.priceRange && (
              <>
                <span>·</span>
                <span>{data.priceRange}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        {data.strengths.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Strengths</p>
            <div className="flex flex-wrap gap-1">
              {data.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-normal text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.weaknesses.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Weaknesses</p>
            <div className="flex flex-wrap gap-1">
              {data.weaknesses.map((w, i) => (
                <Badge key={i} variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-normal text-xs">
                  {w}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Channels */}
      {data.channels.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Active Channels</p>
          <div className="flex flex-wrap gap-1">
            {data.channels.map((ch, i) => (
              <Badge key={i} variant="outline" className="font-normal text-xs">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Positioning */}
      {data.positioning && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Positioning</p>
          <p className="text-sm">{data.positioning}</p>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{data.notes}</p>
        </div>
      )}

      {/* STAGE_B: Competitor logo display, SWOT matrix visualization */}
    </div>
  )
}
