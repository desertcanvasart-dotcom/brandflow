'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Plus, X, GripVertical, Sparkles } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SOPStepData } from '@/types/kb-forms'

// ---------------------------------------------------------------------------
// AiFieldWrapper — shared wrapper for AI-filled & locked-by indicators
// ---------------------------------------------------------------------------
function AiFieldWrapper({ children, isAiFilled, isLockedBy }: {
  children: React.ReactNode
  isAiFilled?: boolean
  isLockedBy?: { name: string; avatarUrl?: string }
  label?: string
}) {
  return (
    <div className={cn(
      'relative rounded-md transition-colors',
      isAiFilled && 'border-l-4 border-amber-400 bg-amber-50 pl-3 py-1'
    )}>
      {isAiFilled && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="absolute top-1 right-1 text-amber-500">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Filled by AI — please review
          </TooltipContent>
        </Tooltip>
      )}
      {isLockedBy && (
        <div className="flex items-center gap-1 mb-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5">
            <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
            {isLockedBy.name} editing…
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// RepeaterField — add/remove string items
// ---------------------------------------------------------------------------
interface RepeaterFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  max?: number
  isAiFilled?: boolean
  isLockedBy?: { name: string; avatarUrl?: string }
}

export function RepeaterField({
  label,
  value,
  onChange,
  placeholder = 'Add item…',
  max = 20,
  isAiFilled,
  isLockedBy,
}: RepeaterFieldProps) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed || value.length >= max) return
    onChange([...value, trimmed])
    setDraft('')
  }

  function remove(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <AiFieldWrapper isAiFilled={isAiFilled} isLockedBy={isLockedBy}>
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={add}
            disabled={!draft.trim() || value.length >= max}
            className="shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {value.map((item, i) => (
              <Badge
                key={i}
                variant="secondary"
                className="gap-1 pr-1 font-normal"
              >
                {item}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </AiFieldWrapper>
  )
}

// ---------------------------------------------------------------------------
// MultiSelectField — toggle chips from a predefined set
// ---------------------------------------------------------------------------
interface MultiSelectFieldProps {
  label: string
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  isAiFilled?: boolean
  isLockedBy?: { name: string; avatarUrl?: string }
}

export function MultiSelectField({
  label,
  options,
  value,
  onChange,
  isAiFilled,
  isLockedBy,
}: MultiSelectFieldProps) {
  function toggle(option: string) {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <AiFieldWrapper isAiFilled={isAiFilled} isLockedBy={isLockedBy}>
      <div className="space-y-1.5">
        <Label className="text-xs">{label}</Label>
        <div className="flex flex-wrap gap-1.5">
          {options.map((option) => {
            const selected = value.includes(option)
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggle(option)}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                  selected
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50'
                )}
              >
                {option}
              </button>
            )
          })}
        </div>
      </div>
    </AiFieldWrapper>
  )
}

// ---------------------------------------------------------------------------
// SortableStepItem — individual draggable step
// ---------------------------------------------------------------------------
function SortableStepItem({
  step,
  index,
  onUpdate,
  onRemove,
}: {
  step: SOPStepData & { _id: string }
  index: number
  onUpdate: (index: number, field: keyof SOPStepData, value: string) => void
  onRemove: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step._id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'rounded-lg border bg-background p-3 space-y-2',
        isDragging && 'opacity-50 shadow-lg'
      )}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="text-xs font-medium text-muted-foreground">
          Step {index + 1}
        </span>
        <div className="ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={() => onRemove(index)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Input
        value={step.title}
        onChange={(e) => onUpdate(index, 'title', e.target.value)}
        placeholder="Step title"
        className="text-sm"
      />
      <Textarea
        value={step.description}
        onChange={(e) => onUpdate(index, 'description', e.target.value)}
        placeholder="Step description…"
        className="text-sm min-h-[60px]"
      />
      <Input
        value={step.responsible ?? ''}
        onChange={(e) => onUpdate(index, 'responsible', e.target.value)}
        placeholder="Responsible person (optional)"
        className="text-sm"
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// StepRepeaterField — add/remove/reorder SOP steps with drag-sort
// ---------------------------------------------------------------------------
interface StepRepeaterFieldProps {
  label: string
  value: SOPStepData[]
  onChange: (value: SOPStepData[]) => void
  isAiFilled?: boolean
  isLockedBy?: { name: string; avatarUrl?: string }
}

// Generate stable IDs for sortable context
let stepCounter = 0
function nextStepId() {
  return `step_${++stepCounter}_${Date.now()}`
}

export function StepRepeaterField({
  label,
  value,
  onChange,
  isAiFilled,
  isLockedBy,
}: StepRepeaterFieldProps) {
  // Maintain internal IDs for DnD
  const [ids, setIds] = useState<string[]>(() =>
    value.map(() => nextStepId())
  )

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  function addStep() {
    onChange([...value, { title: '', description: '', responsible: '' }])
    setIds([...ids, nextStepId()])
  }

  function removeStep(index: number) {
    onChange(value.filter((_, i) => i !== index))
    setIds(ids.filter((_, i) => i !== index))
  }

  function updateStep(index: number, field: keyof SOPStepData, val: string) {
    const updated = [...value]
    updated[index] = { ...updated[index], [field]: val }
    onChange(updated)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)

    onChange(arrayMove(value, oldIndex, newIndex))
    setIds(arrayMove(ids, oldIndex, newIndex))
  }

  const items = value.map((step, i) => ({ ...step, _id: ids[i] ?? `fallback_${i}` }))

  return (
    <AiFieldWrapper isAiFilled={isAiFilled} isLockedBy={isLockedBy}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{label}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStep}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add Step
          </Button>
        </div>
        {items.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map((s) => s._id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {items.map((step, i) => (
                  <SortableStepItem
                    key={step._id}
                    step={step}
                    index={i}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No steps yet. Click &quot;Add Step&quot; to begin.
          </p>
        )}
      </div>
    </AiFieldWrapper>
  )
}
