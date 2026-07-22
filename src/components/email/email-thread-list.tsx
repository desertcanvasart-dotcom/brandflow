'use client'

import { useState } from 'react'
import { Mail, Star, Archive, LinkIcon, Search, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface EmailThreadListProps {
  projectId?: string
  unlinked?: boolean
  onSelectThread: (threadId: string) => void
  selectedThreadId?: string
}

type FilterType = 'all' | 'unread' | 'starred' | 'archived'

export function EmailThreadList({
  projectId,
  unlinked,
  onSelectThread,
  selectedThreadId,
}: EmailThreadListProps) {
  const utils = trpc.useUtils()
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.email.listThreads.useInfiniteQuery(
      {
        projectId,
        unlinked,
        filter,
        limit: 25,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    )

  const { data: searchResults, isLoading: isSearching } =
    trpc.email.searchThreads.useQuery(
      { query: searchQuery, projectId, limit: 20 },
      { enabled: searchQuery.length >= 2 },
    )

  const starMutation = trpc.email.toggleStar.useMutation({
    onSuccess: () => utils.email.listThreads.invalidate(),
    onError: (err) => toast.error(err.message),
  })

  const archiveMutation = trpc.email.archiveThread.useMutation({
    onSuccess: () => {
      toast.success('Thread archived')
      utils.email.listThreads.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const threads = searchQuery.length >= 2
    ? searchResults ?? []
    : data?.pages.flatMap((p) => p.items) ?? []

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'starred', label: 'Starred' },
    { key: 'archived', label: 'Archived' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 px-3 py-2 border-b">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || isSearching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Mail className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No emails found</p>
          </div>
        ) : (
          <>
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => onSelectThread(thread.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition-colors cursor-pointer',
                  selectedThreadId === thread.id && 'bg-muted',
                  !thread.is_read && 'bg-primary/5',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!thread.is_read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                      )}
                      <span
                        className={cn(
                          'text-sm truncate',
                          !thread.is_read ? 'font-semibold' : 'font-medium',
                        )}
                      >
                        {thread.subject || '(No subject)'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {(thread.participants as string[])?.slice(0, 3).join(', ')}
                    </p>
                    {thread.snippet && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {thread.snippet}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(thread.last_message_at), { addSuffix: true })}
                    </span>
                    <div className="flex items-center gap-1">
                      {thread.message_count > 1 && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {thread.message_count}
                        </Badge>
                      )}
                      {thread.is_starred && (
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {/* Load more */}
            {hasNextPage && !searchQuery && (
              <div className="p-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : null}
                  Load more
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
