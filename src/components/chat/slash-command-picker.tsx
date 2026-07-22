'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Sparkles, ListTodo, Target } from 'lucide-react'

interface SlashCommand {
  command: string
  label: string
  description: string
  icon: typeof Sparkles
}

const COMMANDS: SlashCommand[] = [
  {
    command: '/ai summarize',
    label: 'Summarize',
    description: 'AI-powered summary of recent messages',
    icon: Sparkles,
  },
  {
    command: '/ai tasks',
    label: 'Extract Tasks',
    description: 'Extract actionable tasks from chat',
    icon: ListTodo,
  },
  {
    command: '/ai decisions',
    label: 'Extract Decisions',
    description: 'Identify decisions made in chat',
    icon: Target,
  },
]

interface SlashCommandPickerProps {
  open: boolean
  filter: string
  onSelect: (command: string) => void
  onClose: () => void
}

export function SlashCommandPicker({
  open,
  filter,
  onSelect,
  onClose,
}: SlashCommandPickerProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = COMMANDS.filter((cmd) => {
    if (!filter) return true
    const search = filter.toLowerCase()
    return (
      cmd.command.toLowerCase().includes(search) ||
      cmd.label.toLowerCase().includes(search)
    )
  })

  // Reset index when filter changes
  useEffect(() => {
    setActiveIndex(0)
  }, [filter])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open || filtered.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onSelect(filtered[activeIndex].command)
      } else if (e.key === 'Escape') {
        onClose()
      }
    },
    [open, filtered, activeIndex, onSelect, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!open || filtered.length === 0) return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 w-72 rounded-lg border bg-popover p-1 shadow-lg z-50"
    >
      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
        AI Commands
      </div>
      {filtered.map((cmd, index) => {
        const Icon = cmd.icon
        return (
          <button
            key={cmd.command}
            type="button"
            onClick={() => onSelect(cmd.command)}
            className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors ${
              index === activeIndex ? 'bg-accent' : 'hover:bg-accent/50'
            }`}
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
              <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-medium">{cmd.command}</p>
              <p className="text-xs text-muted-foreground">{cmd.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
