'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ListOrdered,
  CalendarIcon,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import {
  PLATFORM_LABELS,
  TASK_STATUS_LABELS,
  TASK_STATUS_COLORS,
} from '@/lib/constants'
import { formatDateTime } from '@/lib/utils'
import { ScheduleDialog } from '@/components/content/schedule-dialog'
import type { Database } from '@/types/database'

type ContentPlatform = Database['public']['Enums']['content_platform']
type TaskStatus = Database['public']['Enums']['task_status']

const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as [ContentPlatform, string][]

const STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
]

function stripHtml(html: string) {
  if (typeof window !== 'undefined') {
    const el = document.createElement('div')
    el.innerHTML = html
    return el.textContent ?? el.innerText ?? ''
  }
  return html.replace(/<[^>]*>/g, '')
}

export default function QueuePage() {
  const utils = trpc.useUtils()
  const [brandId, setBrandId] = useState<string | undefined>(undefined)
  const [platform, setPlatform] = useState<ContentPlatform | undefined>(undefined)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<{ id: string; taskId: string; scheduledAt: string | null } | null>(null)

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: queueItems, isLoading } = trpc.content.listQueue.useQuery({
    brandId,
    platform,
    status: statusFilter,
  })

  const markPublishedMutation = trpc.content.markPublished.useMutation({
    onSuccess: () => {
      invalidateAll()
      toast.success('Content marked as published')
    },
    onError: (err) => toast.error(err.message),
  })

  const unscheduleMutation = trpc.content.unschedule.useMutation({
    onSuccess: () => {
      invalidateAll()
      toast.success('Schedule removed')
    },
    onError: (err) => toast.error(err.message),
  })

  function invalidateAll() {
    utils.content.listQueue.invalidate()
    utils.task.listByBoard.invalidate()
    utils.task.list.invalidate()
    utils.calendar.getContentByRange.invalidate()
  }

  const totalItems = queueItems?.length ?? 0

  return (
    <>
      <TopBar title="Publishing Queue" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ListOrdered className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Publishing Queue</h2>
              <p className="text-sm text-muted-foreground">
                {totalItems > 0
                  ? `${totalItems} item${totalItems !== 1 ? 's' : ''} scheduled`
                  : 'No content in the queue'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={brandId ?? 'all'}
            onValueChange={(v) => setBrandId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={platform ?? 'all'}
            onValueChange={(v) => setPlatform(v === 'all' ? undefined : v as ContentPlatform)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {PLATFORM_OPTIONS.map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter ?? 'all'}
            onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded bg-muted animate-pulse" />
            ))}
          </div>
        ) : queueItems && queueItems.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[35%]">Content</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Scheduled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueItems.map((item) => {
                  const taskStatus = item.tasks.status as TaskStatus
                  const bodyText = item.body ? stripHtml(item.body) : ''
                  const preview = bodyText.length > 80 ? bodyText.slice(0, 80) + '...' : bodyText
                  const isPublished = !!item.published_at

                  return (
                    <TableRow key={item.id}>
                      {/* Content preview */}
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium truncate">{item.tasks.title}</p>
                          {preview && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}</p>
                          )}
                        </div>
                      </TableCell>

                      {/* Platform */}
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {PLATFORM_LABELS[item.platform as ContentPlatform] ?? item.platform}
                        </Badge>
                      </TableCell>

                      {/* Brand */}
                      <TableCell>
                        <span className="text-sm">
                          {item.tasks.projects.brands?.name ?? '—'}
                        </span>
                      </TableCell>

                      {/* Scheduled */}
                      <TableCell>
                        {item.scheduled_at ? (
                          <span className="text-sm">{formatDateTime(item.scheduled_at)}</span>
                        ) : (
                          <span className="text-sm italic text-muted-foreground">Not scheduled</span>
                        )}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: TASK_STATUS_COLORS[taskStatus] }}
                          />
                          <span className="text-xs">{TASK_STATUS_LABELS[taskStatus]}</span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {!isPublished && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  setSelectedItem({
                                    id: item.id,
                                    taskId: item.tasks.id,
                                    scheduledAt: item.scheduled_at,
                                  })
                                  setScheduleDialogOpen(true)
                                }}
                              >
                                <CalendarIcon className="mr-1 h-3 w-3" />
                                Reschedule
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-green-600 hover:text-green-700"
                                onClick={() => markPublishedMutation.mutate({ contentItemId: item.id })}
                                disabled={markPublishedMutation.isPending}
                              >
                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                Publish
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                onClick={() => unscheduleMutation.mutate({ contentItemId: item.id })}
                                disabled={unscheduleMutation.isPending}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {isPublished && item.published_url && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              asChild
                            >
                              <a href={item.published_url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-1 h-3 w-3" />
                                View
                              </a>
                            </Button>
                          )}
                          {isPublished && !item.published_url && (
                            <span className="text-xs text-green-600 font-medium">Published</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center">
            <ListOrdered className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <h3 className="text-sm font-medium">No content in the queue</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Schedule content from the Content Editor to see it here.
            </p>
          </div>
        )}
      </div>

      {/* Schedule dialog */}
      {selectedItem && (
        <ScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          contentItemId={selectedItem.id}
          currentScheduledAt={selectedItem.scheduledAt}
          taskId={selectedItem.taskId}
          onScheduled={() => {
            setScheduleDialogOpen(false)
            setSelectedItem(null)
          }}
        />
      )}
    </>
  )
}
