'use client'

import { ExternalLink } from 'lucide-react'

interface FigmaEmbedProps {
  figmaUrl: string
  className?: string
}

export function FigmaEmbed({ figmaUrl, className }: FigmaEmbedProps) {
  const embedSrc = `https://www.figma.com/embed?embed_host=agencybeats&url=${encodeURIComponent(figmaUrl)}`

  return (
    <div className={className}>
      <div className="aspect-video rounded-lg overflow-hidden border bg-muted">
        <iframe
          src={embedSrc}
          className="w-full h-full border-0"
          allowFullScreen
        />
      </div>
      <a
        href={figmaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ExternalLink className="h-3 w-3" />
        Open in Figma
      </a>
    </div>
  )
}
