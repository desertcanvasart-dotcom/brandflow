'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Target, Trash2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

interface DecisionsPanelProps {
  projectId: string
}

export function DecisionsPanel({ projectId }: DecisionsPanelProps) {
  const utils = trpc.useUtils()

  const { data: decisions, isLoading } = trpc.chat.getProjectDecisions.useQuery(
    { projectId },
    { staleTime: 30_000 }
  )

  const removeMutation = trpc.chat.removeDecision.useMutation({
    onSuccess: () => {
      toast.success('Decision removed')
      utils.chat.getProjectDecisions.invalidate({ projectId })
      utils.chat.getChannelStats.invalidate()
    },
    onError: () => {
      toast.error('Failed to remove decision')
    },
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-20 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    )
  }

  const items = decisions ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4" />
          Decisions
          {items.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({items.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No decisions logged yet. Mark messages as decisions in the chat.
          </p>
        ) : (
          <div className="space-y-3">
            {items.map((decision: any) => {
              // Strip mention markup
              const content = decision.content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
              const date = new Date(decision.created_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })

              return (
                <div
                  key={decision.id}
                  className="group flex items-start gap-2 rounded-md border p-3"
                >
                  <Target className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-3">
                      {content}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Marked by {decision.markerName} · {date}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    onClick={() => removeMutation.mutate({ decisionId: decision.id })}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
