'use client'

import { useState, useCallback, type DragEvent, type ReactNode } from 'react'
import { Upload } from 'lucide-react'

interface KBDropZoneProps {
  children: ReactNode
  onFileDrop: (file: File) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
]

export function KBDropZone({ children, onFileDrop }: KBDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only set to false if we're actually leaving the zone (not entering a child)
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (!file) return

      if (!ACCEPTED_TYPES.includes(file.type)) {
        return // silently ignore unsupported files
      }

      onFileDrop(file)
    },
    [onFileDrop]
  )

  return (
    <div
      className="relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2 text-primary">
            <Upload className="h-10 w-10" />
            <p className="text-lg font-medium">Drop file to add knowledge</p>
            <p className="text-sm text-muted-foreground">PDF, TXT, Markdown, or CSV</p>
          </div>
        </div>
      )}
    </div>
  )
}
