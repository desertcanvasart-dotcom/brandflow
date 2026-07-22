'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  FileText,
  FileIcon,
  File,
  Trash2,
  RotateCcw,
  ExternalLink,
  Loader2,
  Link,
  BookOpen,
  ClipboardList,
  StickyNote,
  Puzzle,
  Globe,
  Clock,
  Share2,
  Eye,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import type { Database } from '@/types/database'
import { useCurrentUser } from '@/hooks/use-current-user'
import { StructuredDisplay } from './display/structured-display'
import { VersionHistoryPanel } from './version-history-panel'
import { ShareDocumentDialog } from './share-document-dialog'
import { PresenceAvatars } from './presence-avatars'

type KBDocumentRow = Database['public']['Tables']['knowledge_base_documents']['Row']

// ── Helpers ──────────────────────────────────────────────────

function getSourceIcon(sourceType: string, mimeType: string | null) {
  switch (sourceType) {
    case 'url_import':
      return <Link className="h-7 w-7 text-cyan-500" />
    case 'brand_guidelines':
      return <BookOpen className="h-7 w-7 text-blue-500" />
    case 'sop':
      return <ClipboardList className="h-7 w-7 text-orange-500" />
    case 'text_note':
      return <StickyNote className="h-7 w-7 text-yellow-600" />
    case 'pasted_text':
      return <FileText className="h-7 w-7 text-purple-500" />
    case 'uploaded_file':
    default:
      if (mimeType === 'application/pdf') return <File className="h-7 w-7 text-red-500" />
      if (mimeType === 'text/markdown') return <FileText className="h-7 w-7 text-blue-500" />
      return <FileIcon className="h-7 w-7 text-gray-500" />
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  brand_guidelines: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  marketing_strategy: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  campaign_history: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  seo_research: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  competitor_analysis: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  customer_personas: 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300',
  sop: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  brand_guidelines: 'Guidelines',
  marketing_strategy: 'Strategy',
  campaign_history: 'Campaigns',
  seo_research: 'SEO',
  competitor_analysis: 'Competitors',
  customer_personas: 'Personas',
  sop: 'SOP',
}

const SCOPE_LABELS: Record<string, string> = {
  agency: 'Agency-wide',
  brand: 'Brand',
  project: 'Project',
}

const CONTENT_TYPE_BADGE: Record<string, { label: string; color: string }> = {
  persona: { label: 'Persona', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  strategy: { label: 'Strategy', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  competitor: { label: 'Competitor', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' },
  campaign: { label: 'Campaign', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' },
  sop: { label: 'SOP', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300' },
}

function getStatusBadge(status: KBDocumentRow['embedding_status']) {
  switch (status) {
    case 'ready':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px] px-1.5 py-0">Ready</Badge>
    case 'processing':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-[10px] px-1.5 py-0">
          <Loader2 className="mr-0.5 h-2.5 w-2.5 animate-spin" />
          Processing
        </Badge>
      )
    case 'failed':
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Failed</Badge>
    case 'no_text':
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">No Text</Badge>
    default:
      return null
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Component ────────────────────────────────────────────────

interface KBDocumentListProps {
  brandId?: string
  category?: string
  knowledgeScope?: string
  search?: string
}

export function KBDocumentList({ brandId, category, knowledgeScope, search }: KBDocumentListProps) {
  const [viewingDoc, setViewingDoc] = useState<KBDocumentRow | null>(null)
  const [historyDocId, setHistoryDocId] = useState<string | null>(null)
  const [shareDoc, setShareDoc] = useState<KBDocumentRow | null>(null)

  const { user } = useCurrentUser()
  const utils = trpc.useUtils()
  const { data: documents, isLoading } = trpc.knowledgeBase.list.useQuery({
    brandId,
    search: search || undefined,
    category: category && category !== 'all' ? (category as any) : undefined,
    knowledgeScope: knowledgeScope && knowledgeScope !== 'all' ? (knowledgeScope as any) : undefined,
  })

  const deleteMutation = trpc.knowledgeBase.delete.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getStats.invalidate()
      toast.success('Document deleted')
      setViewingDoc(null)
    },
    onError: (err) => toast.error(err.message),
  })

  const retryMutation = trpc.knowledgeBase.retry.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      toast.success('Retrying extraction...')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-16 rounded bg-muted" />
              <div className="mt-3 h-4 w-24 rounded bg-muted" />
              <div className="mt-2 h-3 w-16 rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!documents || documents.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <div className="text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No documents found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add knowledge to train your AI agents — upload files, paste text, import URLs, or use templates.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="group relative cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => setViewingDoc(doc)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 rounded-lg bg-muted p-2">
                  {getSourceIcon(doc.source_type, doc.mime_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {doc.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Category badge + content type + scope */}
              <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CATEGORY_COLORS[doc.category] ?? CATEGORY_COLORS.general}`}
                >
                  {CATEGORY_LABELS[doc.category] ?? doc.category}
                </span>
                {doc.content_type && CONTENT_TYPE_BADGE[doc.content_type] && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${CONTENT_TYPE_BADGE[doc.content_type].color}`}
                  >
                    {CONTENT_TYPE_BADGE[doc.content_type].label}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {SCOPE_LABELS[doc.knowledge_scope] ?? doc.knowledge_scope}
                </span>
              </div>

              {/* Status + chunk count */}
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {getStatusBadge(doc.embedding_status)}
                  {doc.chunk_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Puzzle className="h-2.5 w-2.5" />
                      {doc.chunk_count} segments
                    </span>
                  )}
                </div>
                {doc.word_count > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    {doc.word_count.toLocaleString()} words
                  </span>
                )}
              </div>

              {/* Public sharing badge */}
              {(doc as any).is_public && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                    <Globe className="mr-0.5 h-2.5 w-2.5" />
                    Public
                  </Badge>
                  {(doc as any).public_view_count > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                      <Eye className="h-2.5 w-2.5" />
                      {(doc as any).public_view_count}
                    </span>
                  )}
                </div>
              )}

              {/* Source URL for url_import */}
              {doc.source_type === 'url_import' && doc.source_url && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Globe className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{doc.source_url}</span>
                </div>
              )}

              {/* Footer */}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {formatDate(doc.created_at)}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.embedding_status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation()
                        retryMutation.mutate({ id: doc.id })
                      }}
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove &quot;{doc.title}&quot; and its
                          embeddings from the knowledge base.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate({ id: doc.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Document Viewer Dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          {viewingDoc && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="flex items-center gap-2">
                    {getSourceIcon(viewingDoc.source_type, viewingDoc.mime_type)}
                    {viewingDoc.title}
                  </DialogTitle>
                  {/* Collaborative presence — shows other users viewing this document */}
                  {user && (
                    <PresenceAvatars
                      documentId={viewingDoc.id}
                      currentUser={{
                        id: user.id,
                        name: user.user_metadata?.full_name ?? user.email ?? 'User',
                        avatarUrl: user.user_metadata?.avatar_url,
                      }}
                    />
                  )}
                  {/* STAGE_B: Collaborative rich text editing within textareas */}
                </div>
              </DialogHeader>

              <div className="space-y-4 overflow-y-auto flex-1">
                {/* Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {getStatusBadge(viewingDoc.embedding_status)}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[viewingDoc.category] ?? CATEGORY_COLORS.general}`}
                  >
                    {CATEGORY_LABELS[viewingDoc.category] ?? viewingDoc.category}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {SCOPE_LABELS[viewingDoc.knowledge_scope] ?? viewingDoc.knowledge_scope}
                  </Badge>
                  {viewingDoc.chunk_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Puzzle className="mr-1 h-3 w-3" />
                      {viewingDoc.chunk_count} segments indexed
                    </Badge>
                  )}
                  {viewingDoc.word_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {viewingDoc.word_count.toLocaleString()} words
                    </Badge>
                  )}
                  {viewingDoc.file_size && (
                    <Badge variant="outline" className="text-xs">{formatFileSize(viewingDoc.file_size)}</Badge>
                  )}
                </div>

                {viewingDoc.description && (
                  <p className="text-sm text-muted-foreground">{viewingDoc.description}</p>
                )}

                {/* Source URL */}
                {viewingDoc.source_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={viewingDoc.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {viewingDoc.source_url}
                    </a>
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  {viewingDoc.file_name && <span>{viewingDoc.file_name} · </span>}
                  Uploaded {formatDate(viewingDoc.created_at)}
                </div>

                {/* Content type badge in dialog */}
                {viewingDoc.content_type && CONTENT_TYPE_BADGE[viewingDoc.content_type] && (
                  <Badge className={CONTENT_TYPE_BADGE[viewingDoc.content_type].color}>
                    {CONTENT_TYPE_BADGE[viewingDoc.content_type].label}
                  </Badge>
                )}

                {/* Public sharing info */}
                {(viewingDoc as any).is_public && (
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">
                      <Globe className="mr-1 h-3 w-3" />
                      Public
                    </Badge>
                    {(viewingDoc as any).public_view_count > 0 && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {(viewingDoc as any).public_view_count} views
                      </span>
                    )}
                  </div>
                )}

                {viewingDoc.error_message && (
                  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    <strong>Error:</strong> {viewingDoc.error_message}
                  </div>
                )}

                {/* Structured display for custom form documents */}
                {viewingDoc.content_type && viewingDoc.structured_data && (
                  <div className="rounded-md border p-4">
                    <StructuredDisplay doc={viewingDoc} />
                  </div>
                )}

                {/* Extracted text preview — shown below structured display or alone for generic docs */}
                {viewingDoc.extracted_text && !viewingDoc.content_type && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Extracted Text</h4>
                    <div className="max-h-[40vh] overflow-y-auto rounded-md border bg-muted/50 p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {viewingDoc.extracted_text}
                      </pre>
                    </div>
                  </div>
                )}
                {/* STAGE_B: Raw text toggle for structured docs that also have extracted_text */}

                {/* Actions */}
                <div className="flex gap-2 pt-2 flex-wrap">
                  {/* Version History */}
                  {viewingDoc.content_type && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryDocId(viewingDoc.id)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      History
                    </Button>
                  )}

                  {/* Share */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareDoc(viewingDoc)}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>

                  {viewingDoc.file_url && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={viewingDoc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Download Original
                      </a>
                    </Button>
                  )}
                  {viewingDoc.embedding_status === 'failed' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        retryMutation.mutate({ id: viewingDoc.id })
                        setViewingDoc(null)
                      }}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Retry
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete document?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove &quot;{viewingDoc.title}&quot; and its
                          embeddings from the knowledge base.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate({ id: viewingDoc.id })}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Panel */}
      {historyDocId && (
        <VersionHistoryPanel
          documentId={historyDocId}
          open={!!historyDocId}
          onOpenChange={(open) => {
            if (!open) setHistoryDocId(null)
          }}
        />
      )}

      {/* Share Document Dialog */}
      {shareDoc && (
        <ShareDocumentDialog
          documentId={shareDoc.id}
          documentTitle={shareDoc.title}
          isPublic={(shareDoc as any).is_public ?? false}
          publicSlug={(shareDoc as any).public_slug ?? null}
          publicExpiresAt={(shareDoc as any).public_expires_at ?? null}
          publicViewCount={(shareDoc as any).public_view_count ?? 0}
          open={!!shareDoc}
          onOpenChange={(open) => {
            if (!open) {
              setShareDoc(null)
              utils.knowledgeBase.list.invalidate()
            }
          }}
        />
      )}
    </>
  )
}
