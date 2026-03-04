'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface TranscriptSegment {
  speaker?: string
  text: string
  start?: number
  end?: number
}

interface TranscriptViewerProps {
  transcript: string | null
  segments?: TranscriptSegment[]
  summary?: string | null
  isLoading?: boolean
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function TranscriptViewer({ transcript, segments, summary, isLoading }: TranscriptViewerProps) {
  const [copied, setCopied] = useState(false)

  async function copyTranscript() {
    if (!transcript) return
    await navigator.clipboard.writeText(transcript)
    setCopied(true)
    toast.success('Transcript copied')
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-5/6 rounded bg-muted" />
            <div className="h-4 w-2/3 rounded bg-muted" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!transcript) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No transcript available yet. The transcript will appear after the meeting ends.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{summary}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Transcript</CardTitle>
            <Button variant="ghost" size="sm" onClick={copyTranscript}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {segments && segments.length > 0 ? (
              <div className="space-y-3">
                {segments.map((segment, i) => (
                  <div key={i} className="group">
                    <div className="flex items-center gap-2 mb-1">
                      {segment.speaker && (
                        <Badge variant="outline" className="text-xs">
                          {segment.speaker}
                        </Badge>
                      )}
                      {segment.start !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(segment.start)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed">{segment.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
