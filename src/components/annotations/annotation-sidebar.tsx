'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  MapPin, Square, ArrowUpRight, CheckCircle, Trash2, Eye, EyeOff, Send,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useAnnotationStore } from '@/stores/annotation-store'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Database } from '@/types/database'

type Annotation = Database['public']['Tables']['annotations']['Row'] & {
  users?: { full_name: string | null; email: string } | null
}

const TOOL_ICONS = {
  pin: MapPin,
  rectangle: Square,
  arrow: ArrowUpRight,
}

interface AnnotationSidebarProps {
  deliverableId: string
  annotations: Annotation[]
}

export function AnnotationSidebar({ deliverableId, annotations }: AnnotationSidebarProps) {
  const {
    activeTool, setActiveTool, selectedAnnotationId, setSelectedAnnotationId,
    showAnnotations, toggleAnnotations,
  } = useAnnotationStore()
  const [newComment, setNewComment] = useState('')
  const utils = trpc.useUtils()

  const resolveMutation = trpc.annotation.resolve.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate({ deliverableId })
      toast.success('Annotation resolved')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.annotation.delete.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate({ deliverableId })
      setSelectedAnnotationId(null)
      toast.success('Annotation deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.annotation.update.useMutation({
    onSuccess: () => {
      utils.annotation.list.invalidate({ deliverableId })
      setNewComment('')
      toast.success('Comment saved')
    },
    onError: (err) => toast.error(err.message),
  })

  const unresolved = annotations.filter((a) => !a.is_resolved)
  const resolved = annotations.filter((a) => a.is_resolved)

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Annotations ({annotations.length})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="show-annotations" className="text-xs text-muted-foreground">
              {showAnnotations ? 'Visible' : 'Hidden'}
            </Label>
            <Switch
              id="show-annotations"
              checked={showAnnotations}
              onCheckedChange={toggleAnnotations}
            />
          </div>
        </div>
        {/* Tool selection */}
        <div className="flex gap-1 mt-2">
          {(['pin', 'rectangle', 'arrow'] as const).map((tool) => {
            const Icon = TOOL_ICONS[tool]
            return (
              <Button
                key={tool}
                variant={activeTool === tool ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTool(activeTool === tool ? null : tool)}
              >
                <Icon className="h-4 w-4" />
              </Button>
            )
          })}
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="space-y-2">
            {unresolved.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Open ({unresolved.length})
                </p>
                {unresolved.map((annotation, i) => (
                  <div
                    key={annotation.id}
                    className={cn(
                      'rounded-lg border p-3 cursor-pointer transition-colors',
                      selectedAnnotationId === annotation.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'hover:bg-accent/50'
                    )}
                    onClick={() =>
                      setSelectedAnnotationId(
                        selectedAnnotationId === annotation.id ? null : annotation.id
                      )
                    }
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {annotation.users?.full_name || annotation.users?.email || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            resolveMutation.mutate({ id: annotation.id })
                          }}
                        >
                          <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteMutation.mutate({ id: annotation.id })
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                    {annotation.body && (
                      <p className="text-sm">{annotation.body}</p>
                    )}

                    {selectedAnnotationId === annotation.id && !annotation.body && (
                      <div className="flex gap-2 mt-2">
                        <Textarea
                          placeholder="Add a comment..."
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={2}
                          className="text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="icon"
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (newComment.trim()) {
                              updateMutation.mutate({
                                id: annotation.id,
                                body: newComment.trim(),
                              })
                            }
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}

            {resolved.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-4">
                  Resolved ({resolved.length})
                </p>
                {resolved.map((annotation, i) => (
                  <div
                    key={annotation.id}
                    className="rounded-lg border p-3 opacity-60"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white text-xs font-bold">
                        ✓
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {annotation.users?.full_name || annotation.users?.email || 'Unknown'}
                      </span>
                    </div>
                    {annotation.body && (
                      <p className="text-sm">{annotation.body}</p>
                    )}
                  </div>
                ))}
              </>
            )}

            {annotations.length === 0 && (
              <div className="text-center py-8">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">
                  No annotations yet. Select a tool and click on the image to add one.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
