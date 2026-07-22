'use client'

import { Brain, Puzzle, FileText } from 'lucide-react'
import { trpc } from '@/trpc/client'

interface KBStatsBarProps {
  brandId?: string
}

export function KBStatsBar({ brandId }: KBStatsBarProps) {
  const { data: stats } = trpc.knowledgeBase.getStats.useQuery(
    brandId ? { brandId } : undefined
  )

  if (!stats) return null

  const items = [
    {
      icon: Brain,
      label: 'Documents',
      value: stats.totalDocs,
      color: 'text-purple-500',
    },
    {
      icon: Puzzle,
      label: 'Segments Indexed',
      value: stats.totalChunks,
      color: 'text-blue-500',
    },
    {
      icon: FileText,
      label: 'Total Words',
      value: stats.totalWords,
      color: 'text-green-500',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-center gap-3 rounded-lg border bg-card p-3"
        >
          <div className={`flex-shrink-0 ${item.color}`}>
            <item.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">
              {item.value.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
