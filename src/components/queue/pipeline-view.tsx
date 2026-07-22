'use client'

import { useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { QUEUE_PIPELINE_COLUMNS } from '@/lib/constants'
import { QueueCard, type PipelineItem, type SocialConnectionStatus } from './queue-card'

// ─── Types ────────────────────────────────────────────
interface PipelineViewProps {
  items: PipelineItem[]
  pendingMoves: Map<string, string>
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onScheduleDrop: (item: PipelineItem) => void
  onPublish: (contentItemId: string) => void
  onUnschedule: (contentItemId: string) => void
  onDrop: (item: PipelineItem, targetColumnId: string) => void
  isPending?: boolean
  getSocialConnection?: (item: PipelineItem) => SocialConnectionStatus
}

// ─── Draggable Card Wrapper ───────────────────────────
function DraggableCard({
  item,
  columnId,
  canDrag,
  ...cardProps
}: {
  item: PipelineItem
  columnId: string
  canDrag: boolean
} & Omit<
  React.ComponentProps<typeof QueueCard>,
  'item' | 'columnId' | 'isDragging'
>) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `queue-${item.id}`,
    data: { item, columnId },
    disabled: !canDrag,
  })

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? attributes : {})}
      {...(canDrag ? listeners : {})}
      className={canDrag ? 'cursor-grab active:cursor-grabbing' : undefined}
    >
      <QueueCard
        item={item}
        columnId={columnId}
        isDragging={isDragging}
        {...cardProps}
      />
    </div>
  )
}

// ─── Droppable Column ─────────────────────────────────
function PipelineColumn({
  column,
  items,
  selectedIds,
  onToggleSelect,
  onScheduleDrop,
  onPublish,
  onUnschedule,
  isPending,
  getSocialConnection,
}: {
  column: (typeof QUEUE_PIPELINE_COLUMNS)[number]
  items: PipelineItem[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onScheduleDrop: (item: PipelineItem) => void
  onPublish: (contentItemId: string) => void
  onUnschedule: (contentItemId: string) => void
  isPending?: boolean
  getSocialConnection?: (item: PipelineItem) => SocialConnectionStatus
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: !column.canDropTo,
  })

  const anySelected = selectedIds.size > 0

  return (
    <div className="flex-1 min-w-[240px]">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <div className={cn('h-2.5 w-2.5 rounded-full', column.dot)} />
        <span className="text-sm font-semibold">{column.label}</span>
        <span className="text-xs text-muted-foreground font-medium">
          {items.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'rounded-lg border-2 border-dashed p-2 space-y-2 min-h-[300px] transition-colors',
          isOver && column.canDropTo
            ? 'border-primary/40 bg-primary/5'
            : 'border-transparent bg-muted/20',
        )}
      >
        {items.map((item) => (
          <DraggableCard
            key={item.id}
            item={item}
            columnId={column.id}
            canDrag={column.canDragFrom}
            isSelected={selectedIds.has(item.id)}
            anySelected={anySelected}
            onSelect={onToggleSelect}
            onSchedule={onScheduleDrop}
            onPublish={onPublish}
            onUnschedule={onUnschedule}
            isPending={isPending}
            socialConnection={getSocialConnection?.(item)}
          />
        ))}
        {items.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No items
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Pipeline View ────────────────────────────────────
export function PipelineView({
  items,
  pendingMoves,
  selectedIds,
  onToggleSelect,
  onScheduleDrop,
  onPublish,
  onUnschedule,
  onDrop,
  isPending,
  getSocialConnection,
}: PipelineViewProps) {
  const [activeItem, setActiveItem] = useState<PipelineItem | null>(null)
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Group items into columns, applying pending moves
  const columnItems = useMemo(() => {
    const map = new Map<string, PipelineItem[]>()
    for (const col of QUEUE_PIPELINE_COLUMNS) {
      map.set(col.id, [])
    }

    for (const item of items) {
      // Check if this item has a pending move
      const effectiveStatus = pendingMoves.get(item.id) ?? item.tasks.status

      // Find which column this status belongs to
      for (const col of QUEUE_PIPELINE_COLUMNS) {
        if ((col.statuses as readonly string[]).includes(effectiveStatus)) {
          map.get(col.id)!.push(item)
          break
        }
      }
    }

    return map
  }, [items, pendingMoves])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { item: PipelineItem; columnId: string } | undefined
    setActiveItem(data?.item ?? null)
    setActiveColumnId(data?.columnId ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedItem = event.active.data.current?.item as PipelineItem | undefined
      const sourceColumn = event.active.data.current?.columnId as string | undefined
      const targetColumn = event.over?.id as string | undefined

      setActiveItem(null)
      setActiveColumnId(null)

      if (!draggedItem || !sourceColumn || !targetColumn || sourceColumn === targetColumn) return

      // Find column config for target
      const targetCol = QUEUE_PIPELINE_COLUMNS.find((c) => c.id === targetColumn)
      if (!targetCol?.canDropTo) return

      onDrop(draggedItem, targetColumn)
    },
    [onDrop]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-2">
        {QUEUE_PIPELINE_COLUMNS.map((col) => (
          <PipelineColumn
            key={col.id}
            column={col}
            items={columnItems.get(col.id) ?? []}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onScheduleDrop={onScheduleDrop}
            onPublish={onPublish}
            onUnschedule={onUnschedule}
            isPending={isPending}
            getSocialConnection={getSocialConnection}
          />
        ))}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && activeColumnId && (
          <QueueCard
            item={activeItem}
            columnId={activeColumnId}
            isSelected={false}
            anySelected={false}
            onSelect={() => {}}
            onSchedule={() => {}}
            onPublish={() => {}}
            onUnschedule={() => {}}
            isOverlay
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
