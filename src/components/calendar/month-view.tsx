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

interface MonthViewProps {
  year: number
  month: number
  eventsByDate: Map<string, CalendarEvent[]>
  onEventDrop: (event: CalendarEvent, newDate: string) => void
  onDayClick: (date: Date) => void
  onQuickCreate: (date: Date) => void
}

function getMonthDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startPad = firstDay.getDay()
  const days: (Date | null)[] = []

  for (let i = 0; i < startPad; i++) days.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  return days
}

function formatDateKey(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ─── Draggable Event Wrapper ──────────────────────────
function DraggableEvent({ event }: { event: CalendarEvent }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  })

  return (
    <div ref={setNodeRef} {...attributes} {...listeners}>
      <CalendarEventBlock event={event} compact isDragging={isDragging} />
    </div>
  )
}

// ─── Droppable Day Cell ───────────────────────────────
function DayCell({
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
  const maxVisible = 3

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'min-h-[120px] border-t border-r p-1.5 transition-colors group/cell',
        isToday && 'bg-blue-50/70 ring-2 ring-inset ring-blue-200',
        isOver && 'bg-primary/5 ring-2 ring-inset ring-primary/30',
        !isToday && !isOver && 'hover:bg-gray-50/50',
      )}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className={cn(
            'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold cursor-pointer transition-colors',
            isToday
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:bg-muted',
          )}
          onClick={() => onDayClick(day)}
        >
          {day.getDate()}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onQuickCreate(day)
          }}
          className="hidden group-hover/cell:flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-0.5">
        {events.slice(0, maxVisible).map((event) => (
          <DraggableEvent key={event.id} event={event} />
        ))}
        {events.length > maxVisible && (
          <button
            type="button"
            onClick={() => onDayClick(day)}
            className="text-[10px] text-muted-foreground pl-1 hover:text-foreground cursor-pointer"
          >
            +{events.length - maxVisible} more
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Month View ───────────────────────────────────────
export function MonthView({
  year,
  month,
  eventsByDate,
  onEventDrop,
  onDayClick,
  onQuickCreate,
}: MonthViewProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const days = useMemo(() => getMonthDays(year, month), [year, month])

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
      <div className="border rounded-lg overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 text-center text-xs font-semibold text-muted-foreground border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="py-3">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            if (!day) {
              return (
                <div
                  key={`pad-${i}`}
                  className="min-h-[120px] border-t border-r bg-gray-50/40"
                />
              )
            }

            const dateKey = formatDateKey(day)
            const isToday = dateKey === todayKey
            const dayEvents = eventsByDate.get(dateKey) ?? []

            return (
              <DayCell
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
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeEvent && (
          <CalendarEventBlock event={activeEvent} compact isOverlay />
        )}
      </DragOverlay>
    </DndContext>
  )
}
