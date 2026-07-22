'use client'

import { Card, CardContent } from '@/components/ui/card'
import {
  BookOpen,
  Users,
  TrendingUp,
  Target,
  Megaphone,
} from 'lucide-react'

interface KBSuggestedUploadsProps {
  onSuggestionClick: (suggestion: {
    title: string
    category: string
    sourceType: string
    description: string
  }) => void
  documentCount: number
}

const SUGGESTIONS = [
  {
    icon: BookOpen,
    title: 'Brand Guidelines',
    description: 'Voice, tone, visual identity, messaging rules',
    category: 'brand_guidelines',
    sourceType: 'brand_guidelines',
    color: 'text-blue-500 bg-blue-50 dark:bg-blue-950',
  },
  {
    icon: Users,
    title: 'Customer Personas',
    description: 'Target audience profiles, demographics, pain points',
    category: 'customer_personas',
    sourceType: 'text_note',
    color: 'text-green-500 bg-green-50 dark:bg-green-950',
  },
  {
    icon: TrendingUp,
    title: 'Marketing Strategy',
    description: 'Content pillars, channel strategy, goals',
    category: 'marketing_strategy',
    sourceType: 'text_note',
    color: 'text-purple-500 bg-purple-50 dark:bg-purple-950',
  },
  {
    icon: Target,
    title: 'Competitor Analysis',
    description: 'Competitor profiles, SWOT, market positioning',
    category: 'competitor_analysis',
    sourceType: 'text_note',
    color: 'text-red-500 bg-red-50 dark:bg-red-950',
  },
  {
    icon: Megaphone,
    title: 'Campaign History',
    description: 'Past campaigns, results, lessons learned',
    category: 'campaign_history',
    sourceType: 'text_note',
    color: 'text-orange-500 bg-orange-50 dark:bg-orange-950',
  },
]

export function KBSuggestedUploads({
  onSuggestionClick,
  documentCount,
}: KBSuggestedUploadsProps) {
  if (documentCount >= 3) return null

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Suggested Knowledge to Add</h3>
        <p className="text-xs text-muted-foreground">
          Help your AI agents produce better results by adding these knowledge types
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {SUGGESTIONS.map((s) => (
          <Card
            key={s.title}
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() =>
              onSuggestionClick({
                title: s.title,
                category: s.category,
                sourceType: s.sourceType,
                description: s.description,
              })
            }
          >
            <CardContent className="p-3 flex items-start gap-2.5">
              <div className={`rounded-md p-1.5 flex-shrink-0 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium leading-tight">{s.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                  {s.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
