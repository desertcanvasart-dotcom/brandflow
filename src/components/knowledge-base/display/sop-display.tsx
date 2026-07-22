'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'
import type { SOPData } from '@/types/kb-forms'

interface SOPDisplayProps {
  data: SOPData
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  per_project: 'Per Project',
  as_needed: 'As Needed',
}

export function SOPDisplay({ data }: SOPDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
          <ClipboardList className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        </div>
        <div>
          <h4 className="font-medium">{data.processName || 'Unnamed Process'}</h4>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {data.owner && <span>Owner: {data.owner}</span>}
            {data.owner && data.frequency && <span>·</span>}
            {data.frequency && (
              <Badge variant="outline" className="text-xs font-normal">
                {FREQUENCY_LABELS[data.frequency] ?? data.frequency}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Steps */}
      {data.steps.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Process Steps</p>
          <div className="space-y-2">
            {data.steps.map((step, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="py-2 px-3">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{step.title}</p>
                      {step.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                      )}
                      {step.responsible && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <span className="font-medium">Responsible:</span> {step.responsible}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tools */}
      {data.tools.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Tools Used</p>
          <div className="flex flex-wrap gap-1">
            {data.tools.map((tool, i) => (
              <Badge key={i} variant="outline" className="font-normal text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {data.notes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
          <p className="text-sm">{data.notes}</p>
        </div>
      )}

      {/* STAGE_B: Step completion tracking, checklists */}
    </div>
  )
}
