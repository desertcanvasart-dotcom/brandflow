'use client'

import { useState } from 'react'
import { MessageSquare, History, ChevronRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TranscriptChat } from './transcript-chat'
import { trpc } from '@/trpc/client'
import { cn } from '@/lib/utils'

interface ProjectTranscriptChatProps {
  projectId: string
  roomId: string
  className?: string
}

/**
 * Per-project RAG chat across all meeting transcripts.
 * Shows recent sessions list + AI chat side by side.
 */
export function ProjectTranscriptChat({ projectId, roomId, className }: ProjectTranscriptChatProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)

  const { data: sessions, isLoading } = trpc.meetingRoom.listSessions.useQuery({
    roomId,
    limit: 20,
  })

  const sessionItems = sessions?.items ?? []
  const sessionsWithTranscripts = sessionItems.filter(
    (s: any) => s.transcript_text || s.summary
  )

  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]', className)}>
      {/* Left: Session list */}
      <div className="border rounded-lg overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b bg-muted/30">
          <History className="h-4 w-4 text-muted-foreground" />
          <h4 className="text-xs font-medium">Meeting Sessions</h4>
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {sessionsWithTranscripts.length} with transcripts
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : sessionsWithTranscripts.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-center px-4">
              <p className="text-xs text-muted-foreground">
                No sessions with transcripts yet. Transcripts become available after meetings end.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {/* "All Sessions" option */}
              <button
                onClick={() => setSelectedSessionId(null)}
                className={cn(
                  'w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-2',
                  selectedSessionId === null && 'bg-accent'
                )}
              >
                <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium">All Project Meetings</p>
                  <p className="text-[10px] text-muted-foreground">Search across all transcripts</p>
                </div>
                {selectedSessionId === null && (
                  <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Individual sessions */}
              {sessionsWithTranscripts.map((session: any) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors flex items-center gap-2',
                    selectedSessionId === session.id && 'bg-accent'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {session.title || 'Untitled Session'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {session.started_at
                        ? new Date(session.started_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })
                        : 'Unknown date'}
                      {session.duration_seconds && (
                        <> · {Math.round(session.duration_seconds / 60)} min</>
                      )}
                    </p>
                  </div>
                  {selectedSessionId === session.id && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: AI Chat */}
      <div className="lg:col-span-2 border rounded-lg overflow-hidden">
        <TranscriptChat
          key={selectedSessionId ?? 'project'}
          sessionId={selectedSessionId ?? undefined}
          projectId={selectedSessionId ? undefined : projectId}
        />
      </div>
    </div>
  )
}
