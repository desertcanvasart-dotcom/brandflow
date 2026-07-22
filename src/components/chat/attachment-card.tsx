'use client'

import Link from 'next/link'
import { ClipboardList, FileText, FileIcon, Download, Video } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface ChatAttachment {
  type: 'task' | 'brief' | 'meeting' | 'file'
  id: string
  title?: string
  service?: string
  serviceType?: string
  status?: string
  fieldsFilled?: number
}

interface AttachmentCardProps {
  attachment: ChatAttachment
  projectId: string | null
}

export function AttachmentCard({ attachment, projectId }: AttachmentCardProps) {
  // ── File attachment ──────────────────────────────────────────
  if (attachment.type === 'file') {
    const isImage = attachment.serviceType?.startsWith('image/')
    const fileUrl = attachment.id // id stores the R2 public URL

    return (
      <div className="mt-1.5 inline-flex flex-col gap-0 rounded-lg border bg-card max-w-xs overflow-hidden">
        {/* Image preview */}
        {isImage && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={fileUrl}
              alt={attachment.title ?? 'Image'}
              className="max-h-48 w-full object-cover"
            />
          </a>
        )}
        <div className="flex items-center gap-2 px-3 py-2">
          <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {attachment.title ?? 'File'}
            </p>
            {attachment.status && (
              <p className="text-xs text-muted-foreground">{attachment.status}</p>
            )}
          </div>
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.title}
            className="shrink-0 rounded-md p-1 hover:bg-accent transition-colors"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
      </div>
    )
  }

  // ── Meeting attachment ───────────────────────────────────────
  if (attachment.type === 'meeting') {
    return (
      <Link
        href={`/meetings?meeting=${attachment.id}`}
        className="block mt-1.5"
      >
        <div className="inline-flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50 max-w-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <Video className="h-3 w-3" />
            Meeting
          </div>
          <span className="font-medium text-foreground truncate">
            {attachment.title ?? 'Meeting'}
          </span>
          {attachment.status && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {attachment.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}
        </div>
      </Link>
    )
  }

  // ── Task attachment ──────────────────────────────────────────
  if (attachment.type === 'task') {
    return (
      <Link
        href={`/projects/${projectId}?task=${attachment.id}`}
        className="block mt-1.5"
      >
        <div className="inline-flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50 max-w-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <ClipboardList className="h-3 w-3" />
            Task
          </div>
          <span className="font-medium text-foreground truncate">
            {attachment.title ?? 'Untitled Task'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {attachment.serviceType && <span>{attachment.serviceType}</span>}
            {attachment.serviceType && attachment.status && <span>·</span>}
            {attachment.status && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {attachment.status.replace(/_/g, ' ')}
              </Badge>
            )}
          </div>
        </div>
      </Link>
    )
  }

  // ── Brief attachment ─────────────────────────────────────────
  if (attachment.type === 'brief') {
    return (
      <Link
        href={`/projects/${projectId}?tab=intake`}
        className="block mt-1.5"
      >
        <div className="inline-flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/50 max-w-xs">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <FileText className="h-3 w-3" />
            Brief
          </div>
          <span className="font-medium text-foreground truncate">
            {attachment.service ? `${attachment.service} Brief` : 'Brief'}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {attachment.status && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {attachment.status.replace(/_/g, ' ')}
              </Badge>
            )}
            {attachment.fieldsFilled !== undefined && (
              <>
                {attachment.status && <span>·</span>}
                <span>{attachment.fieldsFilled} fields filled</span>
              </>
            )}
          </div>
        </div>
      </Link>
    )
  }

  return null
}
