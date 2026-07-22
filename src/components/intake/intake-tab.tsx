'use client'

import { useState } from 'react'
import { Sparkles, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { IntakeReview } from './intake-review'
import { ServiceBriefsList } from './service-briefs-list'

interface IntakeTabProps {
  projectId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meetings: Array<Record<string, any>>
}

export function IntakeTab({ projectId, meetings }: IntakeTabProps) {
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('')

  const utils = trpc.useUtils()
  const { data: intake, isLoading } = trpc.intake.getIntake.useQuery({ projectId })

  const extractMutation = trpc.intake.extractFromMeeting.useMutation({
    onSuccess: () => {
      utils.intake.getIntake.invalidate({ projectId })
      toast.success('Intake extracted successfully')
    },
    onError: (err) => toast.error(err.message),
  })

  const meetingsWithTranscript = meetings.filter(
    (m) => m.transcript && m.status === 'completed'
  )

  const handleExtract = () => {
    if (!selectedMeetingId) {
      toast.error('Please select a meeting')
      return
    }
    extractMutation.mutate({ projectId, meetingId: selectedMeetingId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // No intake yet — show extraction UI
  if (!intake) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <div className="text-center space-y-4 max-w-md">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="font-semibold text-lg">No Intake Data</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Extract structured intake data from a completed meeting transcript to generate service briefs.
              </p>
            </div>

            {meetingsWithTranscript.length > 0 ? (
              <div className="flex items-center gap-2 justify-center">
                <Select value={selectedMeetingId} onValueChange={setSelectedMeetingId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a meeting..." />
                  </SelectTrigger>
                  <SelectContent>
                    {meetingsWithTranscript.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleExtract}
                  disabled={!selectedMeetingId || extractMutation.isPending}
                >
                  {extractMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Extract
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No completed meetings with transcripts available. Complete a meeting first.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Intake exists — show review + briefs
  return (
    <div className="space-y-8">
      <IntakeReview
        intake={intake}
        projectId={projectId}
        onReextract={
          meetingsWithTranscript.length > 0
            ? () => {
                // Re-extract from the same meeting
                if (intake.meeting_id) {
                  extractMutation.mutate({
                    projectId,
                    meetingId: intake.meeting_id,
                  })
                }
              }
            : undefined
        }
      />

      <hr />

      <ServiceBriefsList projectId={projectId} intake={intake} />
    </div>
  )
}
