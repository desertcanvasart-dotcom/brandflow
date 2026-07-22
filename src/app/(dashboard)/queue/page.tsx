'use client'

import { useMemo, useState, useCallback } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ListOrdered,
  Columns3,
  List,
  CheckCircle2,
  X,
  CalendarIcon,
  SendHorizonal,
  Clock,
  Instagram,
  Facebook,
  Twitter,
  Linkedin,
  Youtube,
  Music2,
  BookOpen,
  Mail,
  Globe,
  ExternalLink,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import {
  PLATFORM_LABELS,
  TASK_STATUS_COLORS,
  QUEUE_PIPELINE_COLUMNS,
} from '@/lib/constants'
import { ScheduleDialog } from '@/components/content/schedule-dialog'
import { PipelineView } from '@/components/queue/pipeline-view'
import { QueueCard, type PipelineItem, type SocialConnectionStatus } from '@/components/queue/queue-card'
import type { Database } from '@/types/database'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'

type ContentPlatform = Database['public']['Enums']['content_platform']

const PLATFORM_OPTIONS = Object.entries(PLATFORM_LABELS) as [ContentPlatform, string][]

const PLATFORM_ICONS: Record<ContentPlatform, LucideIcon> = {
  instagram: Instagram,
  facebook: Facebook,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  tiktok: Music2,
  blog: BookOpen,
  newsletter: Mail,
  other: Globe,
}

// ─── Component ────────────────────────────────────────
export default function QueuePage() {
  const utils = trpc.useUtils()

  const [brandId, setBrandId] = useState<string | undefined>(undefined)
  const [platform, setPlatform] = useState<ContentPlatform | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline')

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Schedule dialog
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false)
  const [scheduleItem, setScheduleItem] = useState<{
    id: string
    taskId: string
    scheduledAt: string | null
  } | null>(null)

  // Optimistic pending moves (itemId → target status)
  const [pendingMoves, setPendingMoves] = useState<Map<string, string>>(new Map())

  // ─── Data fetching ──────────────────────────────────
  const { data: brands } = trpc.brand.list.useQuery()
  const { data: pipelineItems, isLoading } = trpc.content.listPipeline.useQuery({
    brandId,
    platform,
  })

  // ─── Social connections lookup ─────────────────────
  const { data: socialConnections } = trpc.social.getConnectionsByOrg.useQuery()

  const socialConnectionMap = useMemo(() => {
    const map = new Map<string, { isConnected: boolean; isActive: boolean }>()
    if (!socialConnections) return map
    for (const conn of socialConnections) {
      const key = `${(conn as any).brand_id}-${(conn as any).platform}`
      map.set(key, {
        isConnected: true,
        isActive: (conn as any).is_active !== false,
      })
    }
    return map
  }, [socialConnections])

  const getSocialConnection = useCallback(
    (item: PipelineItem): SocialConnectionStatus => {
      const key = `${item.tasks.projects.brand_id}-${item.platform}`
      return socialConnectionMap.get(key) ?? null
    },
    [socialConnectionMap],
  )

  // ─── Stats ──────────────────────────────────────────
  const stats = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const col of QUEUE_PIPELINE_COLUMNS) {
      counts[col.id] = 0
    }
    for (const item of pipelineItems ?? []) {
      const effectiveStatus = pendingMoves.get(item.id) ?? item.tasks.status
      for (const col of QUEUE_PIPELINE_COLUMNS) {
        if ((col.statuses as readonly string[]).includes(effectiveStatus)) {
          counts[col.id]++
          break
        }
      }
    }
    return counts
  }, [pipelineItems, pendingMoves])

  const totalItems = pipelineItems?.length ?? 0

  // ─── Invalidation helper ───────────────────────────
  function invalidateAll() {
    utils.content.listPipeline.invalidate()
    utils.content.listQueue.invalidate()
    utils.task.listByBoard.invalidate()
    utils.task.list.invalidate()
    utils.calendar.getContentByRange.invalidate()
  }

  // ─── Mutations ──────────────────────────────────────
  const markPublishedMutation = trpc.content.markPublished.useMutation({
    onMutate: async ({ contentItemId }) => {
      await utils.content.listPipeline.cancel()
      const prev = utils.content.listPipeline.getData({ brandId, platform })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.content.listPipeline.setData({ brandId, platform }, ctx.prev)
      toast.error('Failed to publish content')
    },
    onSettled: (_d, _e, vars) => {
      setPendingMoves((prev) => {
        const next = new Map(prev)
        next.delete(vars.contentItemId)
        return next
      })
      invalidateAll()
    },
    onSuccess: () => toast.success('Content published'),
  })

  const unscheduleMutation = trpc.content.unschedule.useMutation({
    onMutate: async ({ contentItemId }) => {
      await utils.content.listPipeline.cancel()
      const prev = utils.content.listPipeline.getData({ brandId, platform })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.content.listPipeline.setData({ brandId, platform }, ctx.prev)
      toast.error('Failed to unschedule content')
    },
    onSettled: (_d, _e, vars) => {
      setPendingMoves((prev) => {
        const next = new Map(prev)
        next.delete(vars.contentItemId)
        return next
      })
      invalidateAll()
    },
    onSuccess: () => toast.success('Schedule removed'),
  })

  // ─── DnD handler ───────────────────────────────────
  const handleDrop = useCallback(
    (item: PipelineItem, targetColumnId: string) => {
      if (targetColumnId === 'scheduled') {
        // Need date input → open schedule dialog
        setPendingMoves((prev) => new Map(prev).set(item.id, 'scheduled'))
        setScheduleItem({
          id: item.id,
          taskId: item.tasks.id,
          scheduledAt: item.scheduled_at,
        })
        setScheduleDialogOpen(true)
      } else if (targetColumnId === 'published') {
        setPendingMoves((prev) => new Map(prev).set(item.id, 'published'))
        markPublishedMutation.mutate({ contentItemId: item.id })
      } else if (targetColumnId === 'approved') {
        setPendingMoves((prev) => new Map(prev).set(item.id, 'approved'))
        unscheduleMutation.mutate({ contentItemId: item.id })
      }
    },
    [markPublishedMutation, unscheduleMutation]
  )

  // ─── Schedule dialog handlers ──────────────────────
  const handleScheduleOpen = useCallback((item: PipelineItem) => {
    setScheduleItem({
      id: item.id,
      taskId: item.tasks.id,
      scheduledAt: item.scheduled_at,
    })
    setScheduleDialogOpen(true)
  }, [])

  const handleScheduleClose = useCallback(
    (open: boolean) => {
      setScheduleDialogOpen(open)
      if (!open && scheduleItem) {
        // If dialog was cancelled, revert the pending move
        setPendingMoves((prev) => {
          const next = new Map(prev)
          next.delete(scheduleItem.id)
          return next
        })
        setScheduleItem(null)
      }
    },
    [scheduleItem]
  )

  const handleScheduled = useCallback(() => {
    if (scheduleItem) {
      setPendingMoves((prev) => {
        const next = new Map(prev)
        next.delete(scheduleItem.id)
        return next
      })
    }
    setScheduleDialogOpen(false)
    setScheduleItem(null)
    invalidateAll()
  }, [scheduleItem])

  // ─── Publish handler (from card button) ────────────
  const handlePublish = useCallback(
    (contentItemId: string) => {
      setPendingMoves((prev) => new Map(prev).set(contentItemId, 'published'))
      markPublishedMutation.mutate({ contentItemId })
    },
    [markPublishedMutation]
  )

  // ─── Unschedule handler (from card button) ─────────
  const handleUnschedule = useCallback(
    (contentItemId: string) => {
      setPendingMoves((prev) => new Map(prev).set(contentItemId, 'approved'))
      unscheduleMutation.mutate({ contentItemId })
    },
    [unscheduleMutation]
  )

  // ─── Bulk selection ────────────────────────────────
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleBulkPublish = useCallback(async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      setPendingMoves((prev) => new Map(prev).set(id, 'published'))
      markPublishedMutation.mutate({ contentItemId: id })
    }
    clearSelection()
  }, [selectedIds, markPublishedMutation, clearSelection])

  const handleBulkUnschedule = useCallback(async () => {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      setPendingMoves((prev) => new Map(prev).set(id, 'approved'))
      unscheduleMutation.mutate({ contentItemId: id })
    }
    clearSelection()
  }, [selectedIds, unscheduleMutation, clearSelection])

  // ─── List view grouping ────────────────────────────
  const listGroups = useMemo(() => {
    if (!pipelineItems) return []

    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`

    const scheduled = pipelineItems
      .filter((item) => item.scheduled_at)
      .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!))
    const unscheduled = pipelineItems.filter((item) => !item.scheduled_at)

    // Group by date
    const groups: { label: string; items: PipelineItem[] }[] = []
    const dateMap = new Map<string, PipelineItem[]>()

    for (const item of scheduled) {
      const dateKey = item.scheduled_at!.split('T')[0]
      const existing = dateMap.get(dateKey) ?? []
      existing.push(item)
      dateMap.set(dateKey, existing)
    }

    for (const [dateKey, items] of dateMap) {
      let label: string
      if (dateKey === todayStr) label = 'Today'
      else if (dateKey === tomorrowStr) label = 'Tomorrow'
      else {
        const d = new Date(dateKey + 'T00:00:00')
        label = d.toLocaleDateString('default', { weekday: 'short', month: 'short', day: 'numeric' })
      }
      groups.push({ label, items })
    }

    if (unscheduled.length > 0) {
      groups.push({ label: 'Unscheduled', items: unscheduled })
    }

    return groups
  }, [pipelineItems])

  // ─── Compute which column an item belongs to ───────
  function getColumnId(status: string): string {
    for (const col of QUEUE_PIPELINE_COLUMNS) {
      if ((col.statuses as readonly string[]).includes(status)) return col.id
    }
    return 'review'
  }

  const isMutating = markPublishedMutation.isPending || unscheduleMutation.isPending

  return (
    <>
      <TopBar title="Publishing Queue" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Header with stats ─── */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ListOrdered className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Publishing Queue</h2>
              <div className="flex items-center gap-3 mt-1">
                {QUEUE_PIPELINE_COLUMNS.map((col) => (
                  <span key={col.id} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: col.color }}
                    />
                    {col.label}:{' '}
                    <span className="font-semibold text-foreground">{stats[col.id] ?? 0}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Filter bar + view switcher ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
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
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={platform ?? 'all'}
              onValueChange={(v) =>
                setPlatform(v === 'all' ? undefined : (v as ContentPlatform))
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Platforms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {PLATFORM_OPTIONS.map(([value, label]) => {
                  const Icon = PLATFORM_ICONS[value]
                  return (
                    <SelectItem key={value} value={value}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* View switcher */}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as 'pipeline' | 'list')}
          >
            <TabsList>
              <TabsTrigger value="pipeline" className="text-xs px-3 gap-1.5">
                <Columns3 className="h-3.5 w-3.5" />
                Pipeline
              </TabsTrigger>
              <TabsTrigger value="list" className="text-xs px-3 gap-1.5">
                <List className="h-3.5 w-3.5" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* ─── Loading skeleton ─── */}
        {isLoading && (
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-24 rounded bg-muted animate-pulse" />
                <div className="h-32 rounded-lg bg-muted animate-pulse" />
                <div className="h-32 rounded-lg bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {/* ─── Content ─── */}
        {!isLoading && totalItems > 0 && viewMode === 'pipeline' && (
          <PipelineView
            items={pipelineItems!}
            pendingMoves={pendingMoves}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onScheduleDrop={handleScheduleOpen}
            onPublish={handlePublish}
            onUnschedule={handleUnschedule}
            onDrop={handleDrop}
            isPending={isMutating}
            getSocialConnection={getSocialConnection}
          />
        )}

        {!isLoading && totalItems > 0 && viewMode === 'list' && (
          <div className="space-y-6">
            {listGroups.map((group) => (
              <div key={group.label}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
                  {group.label}
                  <span className="ml-2 text-xs font-normal">({group.items.length})</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {group.items.map((item) => (
                    <QueueCard
                      key={item.id}
                      item={item}
                      columnId={getColumnId(item.tasks.status)}
                      isSelected={selectedIds.has(item.id)}
                      anySelected={selectedIds.size > 0}
                      onSelect={toggleSelect}
                      onSchedule={handleScheduleOpen}
                      onPublish={handlePublish}
                      onUnschedule={handleUnschedule}
                      socialConnection={getSocialConnection(item)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── Empty state ─── */}
        {!isLoading && totalItems === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-16 text-center">
            <SendHorizonal className="h-10 w-10 text-muted-foreground/30 mb-4" />
            <h3 className="text-sm font-semibold">No content in the pipeline</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Schedule posts from the Content Editor or create content from your projects to see it
              here.
            </p>
            <Button variant="outline" size="sm" className="mt-4" asChild>
              <Link href="/projects">View Projects</Link>
            </Button>
          </div>
        )}

        {/* ─── Bulk action bar ─── */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <div className="flex items-center gap-3 rounded-xl border bg-white px-5 py-3 shadow-xl">
              <span className="text-sm font-medium">
                {selectedIds.size} selected
              </span>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 text-green-600 hover:text-green-700"
                onClick={handleBulkPublish}
                disabled={isMutating}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Publish All
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={handleBulkUnschedule}
                disabled={isMutating}
              >
                <X className="h-3.5 w-3.5" />
                Unschedule All
              </Button>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={clearSelection}
              >
                Clear
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Schedule dialog ─── */}
      {scheduleItem && (
        <ScheduleDialog
          open={scheduleDialogOpen}
          onOpenChange={handleScheduleClose}
          contentItemId={scheduleItem.id}
          currentScheduledAt={scheduleItem.scheduledAt}
          taskId={scheduleItem.taskId}
          onScheduled={handleScheduled}
        />
      )}
    </>
  )
}
