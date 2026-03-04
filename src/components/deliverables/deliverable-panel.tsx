'use client'

import { useState, useRef } from 'react'
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
  Package,
  Upload,
  FileIcon,
  Download,
  History,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Plus,
  Trash2,
  Paintbrush,
  RefreshCw,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { useFileUpload } from '@/hooks/use-file-upload'
import { FigmaEmbed } from '@/components/figma/figma-embed'
import { FigmaFileBrowser } from '@/components/figma/figma-file-browser'
import type { Database } from '@/types/database'

type DeliverableRow = Database['public']['Tables']['deliverables']['Row']

const DELIVERABLE_TYPE_LABELS: Record<string, string> = {
  wireframe: 'Wireframe',
  mockup: 'Mockup',
  prototype: 'Prototype',
  code: 'Code',
  document: 'Document',
  asset: 'Asset',
  other: 'Other',
}

const DELIVERABLE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  in_review: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  final: 'bg-blue-100 text-blue-700',
}

interface DeliverablePanelProps {
  taskId: string
}

export function DeliverablePanel({ taskId }: DeliverablePanelProps) {
  const utils = trpc.useUtils()
  const { data: items, isLoading } = trpc.deliverable.listByTaskId.useQuery({ taskId })
  const { data: figmaConnection } = trpc.figma.getConnection.useQuery()
  const [figmaBrowserOpen, setFigmaBrowserOpen] = useState(false)

  const createMutation = trpc.deliverable.create.useMutation({
    onSuccess: () => {
      utils.deliverable.listByTaskId.invalidate({ taskId })
      toast.success('Deliverable added')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.deliverable.delete.useMutation({
    onSuccess: () => {
      utils.deliverable.listByTaskId.invalidate({ taskId })
      toast.success('Deliverable removed')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items && items.length > 0 ? (
        items.map((item, index) => (
          <DeliverableCard
            key={item.id}
            item={item}
            taskId={taskId}
            index={index + 1}
            onDelete={() => {
              if (confirm('Remove this deliverable?')) {
                deleteMutation.mutate({ id: item.id })
              }
            }}
          />
        ))
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No deliverables yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add deliverables to start uploading files for this task.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-8 text-xs border-dashed"
          onClick={() => createMutation.mutate({ taskId })}
          disabled={createMutation.isPending}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          {createMutation.isPending ? 'Adding...' : 'Add Deliverable'}
        </Button>

        {figmaConnection && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-dashed"
            onClick={() => setFigmaBrowserOpen(true)}
          >
            <Paintbrush className="h-3.5 w-3.5 mr-1.5" />
            Import from Figma
          </Button>
        )}
      </div>

      {figmaConnection && (
        <FigmaFileBrowser
          open={figmaBrowserOpen}
          onOpenChange={setFigmaBrowserOpen}
          taskId={taskId}
          onImportSuccess={() => utils.deliverable.listByTaskId.invalidate({ taskId })}
        />
      )}
    </div>
  )
}

/* ─── Single Deliverable Card ─── */

interface DeliverableCardProps {
  item: DeliverableRow
  taskId: string
  index: number
  onDelete: () => void
}

function DeliverableCard({ item, taskId, index, onDelete }: DeliverableCardProps) {
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading, progress } = useFileUpload()
  const [expanded, setExpanded] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  const [changeNote, setChangeNote] = useState('')

  // Figma detection
  const metadata = item.metadata as Record<string, unknown> | null
  const isFigmaLinked = !!metadata?.figma_file_key
  const figmaUrl = metadata?.figma_url as string | undefined
  const figmaFileName = metadata?.figma_file_name as string | undefined

  const { data: versions } = trpc.deliverable.getVersions.useQuery(
    { deliverableId: item.id },
    { enabled: showVersions }
  )

  const updateMutation = trpc.deliverable.update.useMutation({
    onSuccess: () => {
      utils.deliverable.listByTaskId.invalidate({ taskId })
      utils.deliverable.getVersions.invalidate({ deliverableId: item.id })
      toast.success('Deliverable updated')
      setChangeNote('')
    },
    onError: (err) => toast.error(err.message),
  })

  const refreshThumbnailMutation = trpc.figma.refreshThumbnail.useMutation({
    onSuccess: () => {
      utils.deliverable.listByTaskId.invalidate({ taskId })
      toast.success('Thumbnail refreshed')
    },
    onError: (err) => toast.error(err.message),
  })

  const statusMutation = trpc.deliverable.updateStatus.useMutation({
    onSuccess: () => {
      utils.deliverable.listByTaskId.invalidate({ taskId })
      toast.success('Status updated')
    },
    onError: (err) => toast.error(err.message),
  })

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const publicUrl = await upload(file, { folder: 'deliverables' })
      updateMutation.mutate({
        id: item.id,
        fileUrl: publicUrl,
        fileName: file.name,
        fileSize: file.size,
        changeNote: changeNote || undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="rounded-lg border bg-card">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">File #{index}</span>
          <Badge variant="secondary" className="text-[10px] h-5">
            {DELIVERABLE_TYPE_LABELS[item.type] ?? item.type}
          </Badge>
          <Badge className={`text-[10px] h-5 ${DELIVERABLE_STATUS_COLORS[item.status] ?? ''}`}>
            {item.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          {/* Current file / Figma embed */}
          {isFigmaLinked && figmaUrl ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Paintbrush className="h-3 w-3 text-purple-500" />
                  <span className="text-xs font-medium truncate">{figmaFileName ?? 'Figma Design'}</span>
                  <Badge variant="outline" className="text-[9px] h-4 px-1">Figma</Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => refreshThumbnailMutation.mutate({ deliverableId: item.id })}
                  disabled={refreshThumbnailMutation.isPending}
                >
                  <RefreshCw className={`h-3 w-3 ${refreshThumbnailMutation.isPending ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <FigmaEmbed figmaUrl={figmaUrl} />
            </div>
          ) : item.file_url ? (
            <div className="rounded-md border bg-muted/20 p-2.5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 shrink-0">
                  <FileIcon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{item.file_name ?? 'File'}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(item.file_size)} · v{item.version}
                  </p>
                </div>
                <a href={item.file_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </a>
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-4 text-center">
              <Upload className="h-6 w-6 mx-auto text-muted-foreground/50" />
              <p className="text-[10px] text-muted-foreground mt-1">No file uploaded</p>
            </div>
          )}

          {/* Upload new version */}
          <div className="space-y-2">
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Change note (optional)"
              className="w-full h-7 rounded-md border border-input bg-background px-2 text-xs"
            />
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
            <Button
              variant="outline" size="sm" className="w-full h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || updateMutation.isPending}
            >
              <Upload className="h-3 w-3 mr-1" />
              {uploading
                ? `Uploading... ${progress}%`
                : item.file_url ? 'Upload New Version' : 'Upload File'}
            </Button>
          </div>

          {/* Status changer */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Status</span>
            <Select
              value={item.status}
              onValueChange={(v) =>
                statusMutation.mutate({
                  id: item.id,
                  status: v as 'draft' | 'in_review' | 'approved' | 'rejected' | 'final',
                })
              }
            >
              <SelectTrigger className="w-28 h-6 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['draft', 'in_review', 'approved', 'rejected', 'final'].map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s.replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Versions toggle */}
          <Button
            variant="ghost" size="sm"
            className="w-full h-6 text-[10px] gap-1 text-muted-foreground"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-3 w-3" />
            Version History
            {showVersions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showVersions && (
            <div className="rounded-md border bg-muted/20 p-2 space-y-1.5">
              {versions && versions.length > 0 ? (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded border bg-white px-2 py-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium">v{v.version_number}</span>
                        <span className="text-[9px] text-muted-foreground truncate max-w-24">
                          {v.file_name}
                        </span>
                      </div>
                      {v.change_note && (
                        <p className="text-[9px] text-muted-foreground">{v.change_note}</p>
                      )}
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    {v.file_url && (
                      <a href={v.file_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]">
                          <Download className="h-2.5 w-2.5 mr-0.5" />
                          View
                        </Button>
                      </a>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-1">No previous versions.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
