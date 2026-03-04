'use client'

import { useMemo } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { trpc } from '@/trpc/client'
import { ACTIVITY_ACTION_LABELS } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { ActivityAction } from '@/types/enums'

interface ActivityFeedProps {
  projectId?: string
}

export function ActivityFeed({ projectId }: ActivityFeedProps) {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = trpc.activity.list.useInfiniteQuery(
    { limit: 15, projectId },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    },
  )

  const items = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  )

  function getDescription(
    action: string,
    metadata: Record<string, unknown> | null,
  ) {
    const actorName = (metadata?.actor_name as string) || 'Someone'
    const actionLabel =
      ACTIVITY_ACTION_LABELS[action as ActivityAction] ?? action
    const entityName = metadata?.entity_name as string | undefined
    const newStatus = metadata?.new_status as string | undefined

    let detail = ''
    if (action === 'status_changed' && newStatus) {
      detail = ` to '${newStatus}'`
    }
    if (entityName) {
      detail += ` '${entityName}'`
    }

    return { actorName, text: `${actorName} ${actionLabel}${detail}` }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No activity yet
          </p>
        ) : (
          <div className="space-y-4">
            {items.map((item) => {
              const metadata = item.metadata as Record<string, unknown> | null
              const { actorName, text } = getDescription(
                item.action,
                metadata,
              )
              const initial = actorName.charAt(0).toUpperCase() || '?'

              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{text}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              )
            })}

            {hasNextPage && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Loading...
                  </>
                ) : (
                  'Load more'
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
