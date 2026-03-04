'use client'

import { use, useState } from 'react'
import { notFound } from 'next/navigation'
import { toast } from 'sonner'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Video, Users, FileText, Sparkles, Calendar, Clock, ArrowLeft,
  Phone, PhoneOff, Loader2, Pencil, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import {
  MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, MEETING_STATUS_COLORS,
} from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import { VideoRoom } from '@/components/meetings/video-room'
import { TranscriptViewer } from '@/components/meetings/transcript-viewer'
import { MeetingSummarizer } from '@/components/ai/meeting-summarizer'
import { BriefGenerator } from '@/components/ai/brief-generator'
import { EditMeetingDialog } from '@/components/meetings/edit-meeting-dialog'
import { InviteParticipantDialog } from '@/components/meetings/invite-participant-dialog'
import { useMeetingStore } from '@/stores/meeting-store'
import type { MeetingStatus, MeetingType } from '@/types/enums'

export default function MeetingDetailPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = use(params)
  const [isJoining, setIsJoining] = useState(false)
  const [livekitToken, setLivekitToken] = useState<string | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { reset: resetMeetingStore } = useMeetingStore()

  const { data: meeting, isLoading } = trpc.meeting.getById.useQuery({ id: meetingId })
  const { data: members } = trpc.member.list.useQuery()

  const utils = trpc.useUtils()

  if (isLoading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="h-4 w-96 rounded bg-muted" />
          </div>
        </div>
      </>
    )
  }

  if (!meeting) {
    notFound()
  }

  async function handleJoin() {
    setIsJoining(true)
    try {
      const data = await utils.meeting.getToken.fetch({ meetingId })
      setLivekitToken(data.token)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to join meeting')
    } finally {
      setIsJoining(false)
    }
  }

  function handleLeave() {
    setLivekitToken(null)
    resetMeetingStore()
  }

  // Helper: resolve user_id to display name
  function getMemberName(userId: string): string {
    const member = members?.find((m) => m.user_id === userId)
    return member?.display_name || userId.slice(0, 8) + '...'
  }

  function getMemberInitials(userId: string): string {
    const member = members?.find((m) => m.user_id === userId)
    return member?.display_name?.charAt(0)?.toUpperCase() ?? '?'
  }

  const scheduledDate = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null
  const isEditable = meeting.status !== 'completed' && meeting.status !== 'cancelled'
  const participantIds = meeting.meeting_participants?.map((p) => p.user_id) ?? []

  // If in video room, show full-screen room
  if (livekitToken && process.env.NEXT_PUBLIC_LIVEKIT_URL) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
          <div className="flex items-center gap-3">
            <h2 className="font-medium">{meeting.title}</h2>
            <Badge variant="outline">Live</Badge>
          </div>
          <Button variant="destructive" size="sm" onClick={handleLeave}>
            <PhoneOff className="mr-2 h-4 w-4" />
            Leave Meeting
          </Button>
        </div>
        <div className="flex-1 min-h-0">
          <VideoRoom
            token={livekitToken}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
            onDisconnect={handleLeave}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <TopBar title={meeting.title} />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/meetings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">{meeting.title}</h2>
                <Badge variant="outline">
                  {MEETING_STATUS_LABELS[meeting.status as MeetingStatus] || meeting.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {MEETING_TYPE_LABELS[meeting.meeting_type as MeetingType] || meeting.meeting_type}
                </Badge>
                {scheduledDate && (
                  <>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(scheduledDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {scheduledDate.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    </div>
                  </>
                )}
                {meeting.duration_minutes && <span>{meeting.duration_minutes} min</span>}
              </div>
              {meeting.description && (
                <p className="text-sm text-muted-foreground mt-2">{meeting.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditable && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Invite
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowEditDialog(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={handleJoin} disabled={isJoining}>
                  {isJoining ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Join Meeting
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="transcript">
              <FileText className="mr-2 h-4 w-4" />
              Transcript
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="mr-2 h-4 w-4" />
              AI
            </TabsTrigger>
            <TabsTrigger value="participants">
              <Users className="mr-2 h-4 w-4" />
              Participants
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Meeting Type
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {MEETING_TYPE_LABELS[meeting.meeting_type as MeetingType] || meeting.meeting_type}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {MEETING_STATUS_LABELS[meeting.status as MeetingStatus] || meeting.status}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Duration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-medium">
                    {meeting.duration_minutes ? `${meeting.duration_minutes} minutes` : 'Not set'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="transcript" className="mt-6">
            <TranscriptViewer
              transcript={meeting.transcript}
              summary={meeting.summary}
            />
          </TabsContent>

          <TabsContent value="ai" className="mt-6 space-y-6">
            <MeetingSummarizer
              meetingId={meeting.id}
              transcript={meeting.transcript}
              meetingType={meeting.meeting_type}
              existingSummary={meeting.summary}
            />
            {meeting.summary && (
              <BriefGenerator
                meetingSummary={meeting.summary}
              />
            )}
          </TabsContent>

          <TabsContent value="participants" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">
                    Participants ({meeting.meeting_participants?.length || 0})
                  </CardTitle>
                  {isEditable && (
                    <Button variant="outline" size="sm" onClick={() => setShowInviteDialog(true)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Participant
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {meeting.meeting_participants && meeting.meeting_participants.length > 0 ? (
                  <div className="space-y-3">
                    {meeting.meeting_participants.map((p) => (
                      <div key={p.user_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {getMemberInitials(p.user_id)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{getMemberName(p.user_id)}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {p.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participants added yet
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <EditMeetingDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        meeting={meeting}
      />
      <InviteParticipantDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        meetingId={meeting.id}
        existingParticipantIds={participantIds}
      />
    </>
  )
}
