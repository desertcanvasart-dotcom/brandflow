'use client'

import { useMemo, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'
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
import { CalendarEventBlock } from './calendar-event'
import type { CalendarEvent } from './types'

interface WeekViewProps {
  currentDate: Date
  eventsByDate: Map<string, CalendarEvent[]>
  onEventDrop: (event: CalendarEvent, newDate: string) => void
  onDayClick: (date: Date) => void
  onQuickCreate: (date: Date) => void
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d
}

// ─── Draggable Event Wrapper ──────────────────────────
function DraggableEvent({ event }: { event: CalendarEvent }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `week-${event.id}`,
    data: { event },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <CalendarEventBlock event={event} isDragging={isDragging} />
    </div>
  )
}

// ─── Droppable Week Day Column ────────────────────────
function WeekDayColumn({
  day,
  events,
  isToday,
  onDayClick,
  onQuickCreate,
}: {
  day: Date
  events: CalendarEvent[]
  isToday: boolean
  onDayClick: (date: Date) => void
  onQuickCreate: (date: Date) => void
}) {
  const dateKey = formatDateKey(day)
  const { setNodeRef, isOver } = useDroppable({ id: dateKey })

  const dayName = day.toLocaleDateString('default', { weekday: 'short' })
  const dayNum = day.getDate()
  const monthName = day.toLocaleDateString('default', { month: 'short' })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[400px] bg-white p-2 transition-colors group/col',
        isToday && 'bg-blue-50/50',
        isOver && 'bg-primary/5',
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b">
        <button
          type="button"
          onClick={() => onDayClick(day)}
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <span className="text-xs text-muted-foreground">{dayName}</span>
          <span
            className={cn(
              'inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold',
              isToday
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'hover:bg-muted',
            )}
          >
            {dayNum}
          </span>
          <span className="text-[10px] text-muted-foreground">{monthName}</span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuickCreate(day)
          }}
          className="hidden group-hover/col:flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Events */}
      <div className="space-y-1">
        {events.map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
        {events.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">
            No events
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Week View ────────────────────────────────────────
export function WeekView({
  currentDate,
  eventsByDate,
  onEventDrop,
  onDayClick,
  onQuickCreate,
}: WeekViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      return d
    })
  }, [currentDate])

  const todayKey = formatDateKey(new Date())

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const calEvent = event.active.data.current?.event as CalendarEvent | undefined
    setActiveEvent(calEvent ?? null)
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveEvent(null)
      const calEvent = event.active.data.current?.event as CalendarEvent | undefined
      const overId = event.over?.id as string | undefined
      if (calEvent && overId && overId !== calEvent.date) {
        onEventDrop(calEvent, overId)
      }
    },
    [onEventDrop]
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-7 gap-px border rounded-lg overflow-hidden bg-border">
        {weekDays.map((day) => {
          const dateKey = formatDateKey(day)
          const isToday = dateKey === todayKey
          const dayEvents = eventsByDate.get(dateKey) ?? []

          return (
            <WeekDayColumn
              key={dateKey}
              day={day}
              events={dayEvents}
              isToday={isToday}
              onDayClick={onDayClick}
              onQuickCreate={onQuickCreate}
            />
          )
        })}
      </div>

      <DragOverlay>
        {activeEvent && (
          <CalendarEventBlock event={activeEvent} isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
