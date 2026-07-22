'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Eye, RotateCcw, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ── Types ────────────────────────────────────────────────────

interface VersionHistoryPanelProps {
  documentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface VersionRow {
  id: string
  document_id: string
  version_number: number
  title: string
  structured_data: Record<string, unknown>
  extracted_text: string | null
  changed_by: string | null
  change_summary: string | null
  created_at: string
}

// ── Helpers ──────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim()
}

function renderFieldValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground italic">Empty</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted-foreground italic">Empty</span>
    }
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((item, i) => (
          <Badge key={i} variant="secondary" className="text-xs">
            {String(item)}
          </Badge>
        ))}
      </div>
    )
  }
  if (typeof value === 'object') {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded p-2">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
  }
  return <span className="text-sm">{String(value)}</span>
}

// ── Component ────────────────────────────────────────────────

export function VersionHistoryPanel({
  documentId,
  open,
  onOpenChange,
}: VersionHistoryPanelProps) {
  const [previewVersion, setPreviewVersion] = useState<VersionRow | null>(null)
  const [restoreVersion, setRestoreVersion] = useState<VersionRow | null>(null)

  const utils = trpc.useUtils()

  const { data: versions, isLoading } = trpc.knowledgeBase.getVersionHistory.useQuery(
    { documentId },
    { enabled: open }
  )

  const { data: currentDoc } = trpc.knowledgeBase.getById.useQuery(
    { id: documentId },
    { enabled: open }
  )

  const { data: members } = trpc.member.list.useQuery(undefined, { enabled: open })

  const restoreMutation = trpc.knowledgeBase.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success('Version restored successfully')
      utils.knowledgeBase.getVersionHistory.invalidate({ documentId })
      utils.knowledgeBase.getById.invalidate({ id: documentId })
      setRestoreVersion(null)
    },
    onError: (err) => toast.error(err.message),
  })

  // Build a map of user_id -> display_name
  const memberNameMap = new Map<string, string>()
  if (members) {
    for (const member of members) {
      memberNameMap.set(member.user_id, member.display_name ?? 'Unknown')
    }
  }

  function getMemberName(userId: string | null): string {
    if (!userId) return 'System'
    return memberNameMap.get(userId) ?? 'Unknown'
  }

  // Build the full version list: versions from DB + current doc as the latest
  const allVersions: VersionRow[] = []

  if (currentDoc) {
    allVersions.push({
      id: 'current',
      document_id: currentDoc.id,
      version_number: currentDoc.current_version ?? 1,
      title: currentDoc.title,
      structured_data: (currentDoc.structured_data ?? {}) as Record<string, unknown>,
      extracted_text: currentDoc.extracted_text,
      changed_by: currentDoc.last_edited_by ?? currentDoc.uploaded_by,
      change_summary: null,
      created_at: currentDoc.last_edited_at ?? currentDoc.created_at,
    })
  }

  if (versions) {
    for (const v of versions) {
      allVersions.push({
        id: v.id,
        document_id: v.document_id,
        version_number: v.version_number,
        title: v.title,
        structured_data: (v.structured_data ?? {}) as Record<string, unknown>,
        extracted_text: v.extracted_text ?? null,
        changed_by: v.changed_by ?? null,
        change_summary: v.change_summary ?? null,
        created_at: v.created_at,
      })
    }
  }

  // Sort descending by version number
  allVersions.sort((a, b) => b.version_number - a.version_number)

  const maxVersion = allVersions.length > 0 ? allVersions[0].version_number : 0

  // Diff helpers for the preview modal
  function getChangedFields(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): Set<string> {
    const changed = new Set<string>()
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
    for (const key of allKeys) {
      if (key.startsWith('_')) continue
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changed.add(key)
      }
    }
    return changed
  }

  // Get the current document's structured data for diff comparison
  const currentStructuredData = currentDoc
    ? ((currentDoc.structured_data ?? {}) as Record<string, unknown>)
    : {}

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-2">
            <SheetTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Version History
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1 px-6 pb-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : allVersions.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-3 text-sm text-muted-foreground">
                  No version history yet.
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Versions are created each time you edit a document.
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Vertical timeline line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-border" />

                <div className="space-y-0">
                  {allVersions.map((version, index) => {
                    const isCurrent = version.version_number === maxVersion
                    const isInitial = version.version_number === 1

                    return (
                      <div
                        key={version.id}
                        className="group relative flex gap-3 py-3"
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 mt-1 flex-shrink-0">
                          <div
                            className={cn(
                              'h-[15px] w-[15px] rounded-full border-2',
                              isCurrent
                                ? 'border-green-500 bg-green-500'
                                : 'border-muted-foreground/30 bg-background'
                            )}
                          />
                        </div>

                        {/* Version content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              Version {version.version_number}
                            </span>
                            {isCurrent && (
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] px-1.5 py-0 dark:bg-green-900/30 dark:text-green-300">
                                Current
                              </Badge>
                            )}
                            {isInitial && !isCurrent && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Initial
                              </Badge>
                            )}
                          </div>

                          {version.change_summary && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {version.change_summary}
                            </p>
                          )}

                          <p className="mt-1 text-xs text-muted-foreground/70">
                            {getMemberName(version.changed_by)} &middot;{' '}
                            {formatRelativeTime(version.created_at)}
                          </p>

                          {/* Hover action buttons */}
                          {!isCurrent && (
                            <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setPreviewVersion(version)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setRestoreVersion(version)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Restore
                              </Button>
                            </div>
                          )}

                          {/* For current version, only show preview */}
                          {isCurrent && allVersions.length > 1 && (
                            <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setPreviewVersion(version)}
                              >
                                <Eye className="mr-1 h-3 w-3" />
                                Preview
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* ── Preview Diff Dialog ─────────────────────────────────── */}
      <Dialog open={!!previewVersion} onOpenChange={() => setPreviewVersion(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {previewVersion && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Version {previewVersion.version_number} Preview
                </DialogTitle>
                <DialogDescription>
                  {previewVersion.change_summary ?? 'Comparing with current version'}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 max-h-[60vh]">
                <div className="space-y-3 pr-4">
                  {(() => {
                    const versionData = previewVersion.structured_data
                    const changedFields = getChangedFields(versionData, currentStructuredData)
                    const allKeys = Array.from(
                      new Set([
                        ...Object.keys(versionData),
                        ...Object.keys(currentStructuredData),
                      ])
                    ).filter((k) => !k.startsWith('_'))

                    if (allKeys.length === 0) {
                      return (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                          No structured data to compare.
                        </p>
                      )
                    }

                    return allKeys.map((key) => {
                      const isChanged = changedFields.has(key)
                      const versionValue = versionData[key]
                      const currentValue = currentStructuredData[key]
                      const wasRemoved =
                        versionValue !== undefined && currentValue === undefined
                      const wasAdded =
                        versionValue === undefined && currentValue !== undefined

                      return (
                        <div
                          key={key}
                          className={cn(
                            'rounded-md border p-3',
                            isChanged ? 'border-amber-300 dark:border-amber-700' : 'border-border'
                          )}
                        >
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">
                            {formatFieldLabel(key)}
                            {isChanged && (
                              <span className="ml-1.5 text-amber-600 dark:text-amber-400">
                                (changed)
                              </span>
                            )}
                          </p>

                          {isChanged ? (
                            <div className="space-y-2">
                              {/* Version value (old) */}
                              <div
                                className={cn(
                                  'rounded p-2 text-sm',
                                  wasAdded
                                    ? 'bg-muted/50'
                                    : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                                )}
                              >
                                <span className="text-[10px] font-medium uppercase tracking-wider block mb-1 opacity-60">
                                  Version {previewVersion.version_number}
                                </span>
                                {wasAdded ? (
                                  <span className="text-muted-foreground italic text-xs">
                                    Not present
                                  </span>
                                ) : (
                                  renderFieldValue(versionValue)
                                )}
                              </div>
                              {/* Current value (new) */}
                              <div
                                className={cn(
                                  'rounded p-2 text-sm',
                                  wasRemoved
                                    ? 'bg-muted/50'
                                    : 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                                )}
                              >
                                <span className="text-[10px] font-medium uppercase tracking-wider block mb-1 opacity-60">
                                  Current
                                </span>
                                {wasRemoved ? (
                                  <span className="text-muted-foreground italic text-xs">
                                    Removed
                                  </span>
                                ) : (
                                  renderFieldValue(currentValue)
                                )}
                              </div>
                            </div>
                          ) : (
                            <div>{renderFieldValue(versionValue)}</div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Restore Confirmation Dialog ──────────────────────────── */}
      <Dialog open={!!restoreVersion} onOpenChange={() => setRestoreVersion(null)}>
        <DialogContent className="sm:max-w-md">
          {restoreVersion && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Restore Version {restoreVersion.version_number}?
                </DialogTitle>
                <DialogDescription>
                  This will create a new version with the content from Version{' '}
                  {restoreVersion.version_number}. Your current version will be preserved
                  in history.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  variant="outline"
                  onClick={() => setRestoreVersion(null)}
                  disabled={restoreMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    restoreMutation.mutate({
                      documentId,
                      versionNumber: restoreVersion.version_number,
                    })
                  }
                  disabled={restoreMutation.isPending}
                >
                  {restoreMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Restore
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
