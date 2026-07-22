'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Users, Quote } from 'lucide-react'
import type { PersonaData } from '@/types/kb-forms'

interface PersonaDisplayProps {
  data: PersonaData
}

export function PersonaDisplay({ data }: PersonaDisplayProps) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 className="font-medium">{data.personaName || 'Unnamed Persona'}</h4>
          {data.role && (
            <p className="text-sm text-muted-foreground">{data.role}</p>
          )}
        </div>
      </div>

      {/* Demographics */}
      {data.demographics && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Demographics</p>
          <p className="text-sm">{data.demographics}</p>
        </div>
      )}

      {/* Goals & Pain Points */}
      <div className="grid grid-cols-2 gap-3">
        {data.goals.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Goals</p>
            <div className="flex flex-wrap gap-1">
              {data.goals.map((g, i) => (
                <Badge key={i} variant="secondary" className="bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 font-normal text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {data.painPoints.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Pain Points</p>
            <div className="flex flex-wrap gap-1">
              {data.painPoints.map((p, i) => (
                <Badge key={i} variant="secondary" className="bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 font-normal text-xs">
                  {p}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preferred Channels */}
      {data.preferredChannels.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Preferred Channels</p>
          <div className="flex flex-wrap gap-1">
            {data.preferredChannels.map((ch, i) => (
              <Badge key={i} variant="outline" className="font-normal text-xs">
                {ch}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Behavior Notes */}
      {data.behaviorNotes && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Behavior Notes</p>
          <p className="text-sm">{data.behaviorNotes}</p>
        </div>
      )}

      {/* Quotes */}
      {data.quotes.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Quotes</p>
          <div className="space-y-2">
            {data.quotes.map((q, i) => (
              <Card key={i} className="bg-muted/30">
                <CardContent className="py-2 px-3 flex items-start gap-2">
                  <Quote className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-sm italic">{q}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* STAGE_B: Avatar image upload for persona */}
    </div>
  )
}
