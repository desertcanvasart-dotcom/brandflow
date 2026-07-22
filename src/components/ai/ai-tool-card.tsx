'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIToolCardProps {
  icon: LucideIcon
  iconColor: string
  title: string
  description: string
  isActive: boolean
  onClick: () => void
}

export function AIToolCard({
  icon: Icon,
  iconColor,
  title,
  description,
  isActive,
  onClick,
}: AIToolCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 text-left transition-all hover:bg-muted/50',
        isActive && 'ring-2 ring-primary bg-muted/30',
      )}
    >
      <div className={cn('mt-0.5 rounded-md p-1.5', isActive ? 'bg-primary/10' : 'bg-muted')}>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
    </button>
  )
}
