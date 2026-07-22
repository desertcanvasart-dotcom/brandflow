'use client'

import { trpc } from '@/trpc/client'
import { Badge } from '@/components/ui/badge'
import { User, UserCheck, UserX } from 'lucide-react'

interface ParticipantListProps {
  sessionId: string
}

export function ParticipantList({ sessionId }: ParticipantListProps) {
  const { data: session } = trpc.meetingRoom.getSession.useQuery(
    { sessionId },
    { refetchInterval: 5000 } // Poll every 5 seconds for live updates
  )

  const participants = (session as any)?.session_participants ?? []

  if (participants.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <User className="h-6 w-6 mx-auto mb-2 opacity-40" />
        No participants yet
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        {participants.filter((p: any) => p.is_present).length} present
      </p>
      {participants.map((participant: any) => (
        <div
          key={participant.id}
          className="flex items-center gap-3 rounded-md px-2 py-2 text-sm"
        >
          {/* Avatar */}
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            participant.is_present ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
          }`}>
            {participant.is_present ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <UserX className="h-4 w-4" />
            )}
          </div>

          {/* Name & info */}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">
              {participant.guest_name ?? participant.user_id?.slice(0, 8) ?? 'Unknown'}
              {participant.guest_name && (
                <span className="text-xs text-muted-foreground ml-1">(Guest)</span>
              )}
            </p>
            {participant.guest_email && (
              <p className="text-xs text-muted-foreground truncate">{participant.guest_email}</p>
            )}
          </div>

          {/* Role badge */}
          <Badge
            variant={participant.role === 'host' ? 'default' : 'outline'}
            className="text-[10px] shrink-0"
          >
            {participant.role}
          </Badge>
        </div>
      ))}
    </div>
  )
}
