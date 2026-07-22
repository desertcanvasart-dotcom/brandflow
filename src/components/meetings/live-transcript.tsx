'use client'

import { trpc } from '@/trpc/client'
import { FileText } from 'lucide-react'

interface LiveTranscriptProps {
  sessionId: string
}

export function LiveTranscript({ sessionId }: LiveTranscriptProps) {
  const { data: session } = trpc.meetingRoom.getSession.useQuery(
    { sessionId },
    { refetchInterval: 10000 } // Poll for transcript updates
  )

  const transcript = session?.transcript_text
  const segments = session?.transcript_segments as Array<{
    speaker: string
    text: string
    start: number
    end: number
  }> | null

  if (!transcript && (!segments || segments.length === 0)) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
        <p>Transcript will appear here once the session recording is processed.</p>
        <p className="text-xs mt-1">Live transcription updates every 10 seconds.</p>
      </div>
    )
  }

  // If we have structured segments, render them
  if (segments && segments.length > 0) {
    return (
      <div className="space-y-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Live Transcript</p>
        {segments.map((segment, i) => (
          <div key={i} className="text-sm">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-medium text-xs text-primary">{segment.speaker}</span>
              <span className="text-[10px] text-muted-foreground">
                {formatTime(segment.start)}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">{segment.text}</p>
          </div>
        ))}
      </div>
    )
  }

  // Fallback to plain transcript text
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground mb-2">Transcript</p>
      <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
        {transcript}
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
