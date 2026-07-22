'use client'

import { trpc } from '@/trpc/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollText, Loader2 } from 'lucide-react'
import { ACTIVITY_ACTION_LABELS } from '@/lib/constants'
import type { ActivityAction } from '@/types/enums'

const ENTITY_TYPE_LABELS: Record<string, string> = {
  task: 'Task',
  comment: 'Comment',
  content_item: 'Content',
  deliverable: 'Deliverable',
  project: 'Project',
  meeting: 'Meeting',
  member: 'Member',
  organization: 'Organization',
  integration: 'Integration',
}

export function AuditLogSettings() {
  const {
    data: auditData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.settings.getAuditLog.useInfiniteQuery(
    { limit: 50 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  )

  const logs = auditData?.pages.flatMap((p) => p.items) ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            Audit Log
          </CardTitle>
          <CardDescription>
            A chronological record of actions taken in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No activity logged yet
            </p>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-44">Time</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => {
                      const actorMember = log.organization_members
                      const actorName = actorMember?.display_name ?? 'Unknown'
                      const actionLabel =
                        ACTIVITY_ACTION_LABELS[log.action as ActivityAction] ?? log.action
                      const entityLabel =
                        ENTITY_TYPE_LABELS[log.entity_type] ?? log.entity_type

                      return (
                        <TableRow key={log.id}>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(log.created_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {actorMember?.avatar_url ? (
                                <img
                                  src={actorMember.avatar_url}
                                  alt={actorName}
                                  className="h-6 w-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                                  {actorName.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm">{actorName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {actionLabel}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {entityLabel}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {hasNextPage && (
                <div className="flex justify-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
