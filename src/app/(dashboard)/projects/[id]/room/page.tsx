'use client'

import { use, useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Video, Copy, Users, Clock, FileText, Plus, ExternalLink } from 'lucide-react'
import { VideoRoom } from '@/components/meetings/video-room'
import { MeetingSidebar } from '@/components/meetings/meeting-sidebar'
import { formatRelative, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

export default function ProjectRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params)
  const { data: room, isLoading } = trpc.meetingRoom.getByProjectId.useQuery({ projectId })
  const { data: sessionsData } = trpc.meetingRoom.listSessions.useQuery(
    { roomId: room?.id ?? '', limit: 10 },
    { enabled: !!room?.id }
  )

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const createSession = trpc.meetingRoom.createSession.useMutation({
    onSuccess: (data) => {
      setActiveSessionId(data.session.id)
      setToken(data.token)
      setServerUrl(data.serverUrl)
      toast.success('Session started')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleStartSession = () => {
    if (!room) return
    createSession.mutate({ roomId: room.id })
  }

  const handleCopyGuestLink = () => {
    if (!room) return
    const url = `${window.location.origin}/meet/${room.slug}`
    navigator.clipboard.writeText(url)
    toast.success('Guest link copied to clipboard')
  }

  const handleLeave = () => {
    setToken(null)
    setServerUrl(null)
    setActiveSessionId(null)
  }

  if (isLoading) {
    return (
      <>
        <TopBar title="Meeting Room" />
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>
      </>
    )
  }

  if (!room) {
    return (
      <>
        <TopBar title="Meeting Room" />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Video className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Meeting Room</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This project doesn&apos;t have a meeting room yet.
          </p>
        </div>
      </>
    )
  }

  // Active video session
  if (token && serverUrl && activeSessionId) {
    return (
      <div className="flex h-[calc(100vh-4rem)]">
        <div className={`flex-1 min-w-0 ${sidebarOpen ? '' : ''}`}>
          <VideoRoom
            token={token}
            serverUrl={serverUrl}
            onDisconnect={handleLeave}
          />
        </div>
        {sidebarOpen && (
          <MeetingSidebar
            sessionId={activeSessionId}
            roomId={room.id}
            projectId={projectId}
            onClose={() => setSidebarOpen(false)}
          />
        )}
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="fixed right-4 top-20 z-50"
            onClick={() => setSidebarOpen(true)}
          >
            <Users className="h-4 w-4" />
          </Button>
        )}
      </div>
    )
  }

  // Room lobby
  const sessions = sessionsData?.items ?? []

  return (
    <>
      <TopBar title={room.name} />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{room.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Persistent meeting room for this project
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyGuestLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Guest Link
            </Button>
            <Button onClick={handleStartSession} disabled={createSession.isPending}>
              <Video className="mr-2 h-4 w-4" />
              {createSession.isPending ? 'Starting...' : 'Start Session'}
            </Button>
          </div>
        </div>

        {/* Guest Link Info */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-sm">
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Guest link:</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
              {typeof window !== 'undefined' ? `${window.location.origin}/meet/${room.slug}` : `/meet/${room.slug}`}
            </code>
            <span className="text-xs text-muted-foreground">
              — Share this with anyone to join without an account
            </span>
          </div>
        </div>

        {/* Session History */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Session History</h3>
          {sessions.length > 0 ? (
            <div className="space-y-2">
              {sessions.map((session) => (
                <Link
                  key={session.id}
                  href={`/projects/${projectId}/room?session=${session.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                      <Video className="h-5 w-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {session.title ?? 'Untitled Session'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelative(session.started_at)}
                        </span>
                        {session.duration_seconds && (
                          <span>
                            {Math.round(session.duration_seconds / 60)} min
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {(session as any).session_participants?.length ?? 0}
                        </span>
                        {session.transcript_text && (
                          <Badge variant="outline" className="text-[10px]">
                            <FileText className="mr-1 h-3 w-3" />
                            Transcript
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant={session.ended_at ? 'secondary' : 'default'}
                      className="text-[10px]"
                    >
                      {session.ended_at ? 'Completed' : 'Active'}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
              <div className="text-center">
                <Video className="h-8 w-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mt-2">
                  No sessions yet. Start one to begin meeting.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
