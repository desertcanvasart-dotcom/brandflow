'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Video, Calendar, Clock, Users } from 'lucide-react'
import { MEETING_TYPE_LABELS, MEETING_STATUS_LABELS, MEETING_STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Database } from '@/types/database'

type Meeting = Database['public']['Tables']['meetings']['Row'] & {
  meeting_participants?: Array<{
    user_id: string
    role: string
    users?: { full_name: string | null; email: string } | null
  }>
  brands?: { name: string } | null
}

interface MeetingCardProps {
  meeting: Meeting
}

export function MeetingCard({ meeting }: MeetingCardProps) {
  const statusColor = MEETING_STATUS_COLORS[meeting.status] || 'bg-gray-100 text-gray-800'
  const scheduledDate = meeting.scheduled_at ? new Date(meeting.scheduled_at) : null

  return (
    <Link href={`/meetings/${meeting.id}`}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                <Video className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-medium truncate">{meeting.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {MEETING_TYPE_LABELS[meeting.meeting_type] || meeting.meeting_type}
                  </Badge>
                  {meeting.brands?.name && (
                    <span className="text-xs text-muted-foreground truncate">
                      {meeting.brands.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Badge className={`shrink-0 ${statusColor}`}>
              {MEETING_STATUS_LABELS[meeting.status] || meeting.status}
            </Badge>
          </div>

          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
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
            {meeting.duration_minutes && (
              <span>{meeting.duration_minutes} min</span>
            )}
          </div>

          {meeting.meeting_participants && meeting.meeting_participants.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex -space-x-2">
                {meeting.meeting_participants.slice(0, 5).map((p) => (
                  <Avatar key={p.user_id} className="h-6 w-6 border-2 border-background">
                    <AvatarFallback className="text-[10px]">
                      {(p.users?.full_name || p.users?.email || '?')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {meeting.meeting_participants.length > 5 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px]">
                    +{meeting.meeting_participants.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
