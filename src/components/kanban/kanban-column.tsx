'use client'

import { useDroppable } from '@dnd-kit/core'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  count: number
  onAdd: () => void
  children: React.ReactNode
}

export function KanbanColumn({ id, title, color, count, onAdd, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { columnId: id },
  })

  return (
    <div className="w-[280px] shrink-0 flex flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground">
            {count}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={onAdd}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver
            ? 'border-primary/50 bg-primary/5'
            : 'border-transparent bg-muted/30'
        }`}
        style={{ minHeight: 120 }}
      >
        {children}
      </div>
    </div>
  )
}
