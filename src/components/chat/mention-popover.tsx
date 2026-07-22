'use client'

import { useEffect, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface MemberOption {
  userId: string
  displayName: string
  avatarUrl: string | null
}

interface MentionPopoverProps {
  open: boolean
  filter: string
  members: MemberOption[]
  onSelect: (member: MemberOption) => void
  onClose: () => void
}

export function MentionPopover({ open, filter, members, onSelect, onClose }: MentionPopoverProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = members.filter((m) =>
    m.displayName.toLowerCase().includes(filter.toLowerCase())
  )

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  // Keyboard navigation
  useEffect(() => {
    if (!open) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, filtered, selectedIndex, onSelect, onClose])

  // Scroll selected item into view
  useEffect(() => {
    const item = listRef.current?.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!open || filtered.length === 0) return null

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto rounded-lg border bg-popover p-1 shadow-md z-50"
    >
      {filtered.map((member, index) => {
        const initials = member.displayName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)

        return (
          <button
            key={member.userId}
            type="button"
            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
              index === selectedIndex
                ? 'bg-accent text-accent-foreground'
                : 'hover:bg-accent/50'
            }`}
            onClick={() => onSelect(member)}
            onMouseEnter={() => setSelectedIndex(index)}
          >
            <Avatar className="h-6 w-6">
              {member.avatarUrl && (
                <AvatarImage src={member.avatarUrl} alt={member.displayName} />
              )}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate">{member.displayName}</span>
          </button>
        )
      })}
    </div>
  )
}
