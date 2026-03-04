'use client'

import { useRef, useCallback } from 'react'
import { trpc } from '@/trpc/client'
import { useAnnotationStore } from '@/stores/annotation-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Annotation = Database['public']['Tables']['annotations']['Row'] & {
  users?: { full_name: string | null; email: string } | null
}

interface AnnotationOverlayProps {
  deliverableId: string
  version?: number
  imageUrl: string
  annotations: Annotation[]
  className?: string
}

export function AnnotationOverlay({
  deliverableId, version, imageUrl, annotations, className,
}: AnnotationOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { activeTool, selectedAnnotationId, setSelectedAnnotationId, showAnnotations } =
    useAnnotationStore()

  const utils = trpc.useUtils()

  const createMutation = trpc.annotation.create.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate({ deliverableId })
      toast.success('Annotation added')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== 'pin' || !containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      const xPercent = ((e.clientX - rect.left) / rect.width) * 100
      const yPercent = ((e.clientY - rect.top) / rect.height) * 100

      createMutation.mutate({
        deliverableId,
        type: 'pin',
        xPercent,
        yPercent,
        version: version || 1,
        body: 'New annotation',
      })
    },
    [activeTool, deliverableId, version, createMutation]
  )

  const filteredAnnotations = annotations.filter((a) => {
    if (!showAnnotations) return false
    return true
  })

  return (
    <div
      ref={containerRef}
      className={cn('relative inline-block', activeTool && 'cursor-crosshair', className)}
      onClick={handleClick}
    >
      <img src={imageUrl} alt="Deliverable" className="w-full h-auto" />

      {filteredAnnotations.map((annotation) => (
        <div
          key={annotation.id}
          className={cn(
            'absolute transform -translate-x-1/2 -translate-y-1/2 z-10',
            'transition-all duration-150',
            selectedAnnotationId === annotation.id && 'scale-125'
          )}
          style={{
            left: `${annotation.x_percent}%`,
            top: `${annotation.y_percent}%`,
          }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedAnnotationId(
              selectedAnnotationId === annotation.id ? null : annotation.id
            )
          }}
        >
          {annotation.type === 'pin' && (
            <div
              className={cn(
                'h-6 w-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-xs font-bold cursor-pointer',
                annotation.is_resolved ? 'bg-green-500' : 'bg-red-500',
                selectedAnnotationId === annotation.id && 'ring-2 ring-blue-500'
              )}
            >
              {filteredAnnotations.indexOf(annotation) + 1}
            </div>
          )}

          {annotation.type === 'rectangle' && (
            <div
              className={cn(
                'border-2 rounded cursor-pointer',
                annotation.is_resolved ? 'border-green-500' : 'border-red-500',
                selectedAnnotationId === annotation.id && 'ring-2 ring-blue-500'
              )}
              style={{
                width: `${(annotation.width_percent || 10)}%`,
                height: `${(annotation.height_percent || 10)}%`,
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
