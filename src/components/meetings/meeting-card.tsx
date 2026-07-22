'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Video,
  Users,
  Eye,
  Calendar,
  Clock,
  Timer,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react'
import {
  MEETING_TYPE_LABELS,
  MEETING_STATUS_LABELS,
  MEETING_STATUS_COLORS,
} from '@/lib/constants'
import type { Database } from '@/types/database'
import type { LucideIcon } from 'lucide-react'

// ─── Types ────────────────────────────────────────────
type MeetingRow = Database['public']['Tables']['meetings']['Row']

export type EnrichedMeeting = MeetingRow & {
  meeting_participants: { id: string; user_id: string; role: string }[]
  brands: { id: string; name: string } | null
  projects: { id: string; name: string } | null
}

export type MemberMap = Map<string, { display_name: string | null }>

export interface MeetingCardProps {
  meeting: EnrichedMeeting
  memberMap: MemberMap
  currentUserId: string
  onEdit: (meeting: EnrichedMeeting) => void
  onCancel: (meetingId: string) => void
}

// ─── Meeting type icons ───────────────────────────────
const MEETING_TYPE_ICONS: Record<string, LucideIcon> = {
  client: Video,
  internal: Users,
  review: Eye,
}

const MEETING_TYPE_ICON_STYLES: Record<string, { icon: string; bg: string }> = {
  client: { icon: 'text-blue-600', bg: 'bg-blue-50' },
  internal: { icon: 'text-purple-600', bg: 'bg-purple-50' },
  review: { icon: 'text-amber-600', bg: 'bg-amber-50' },
}

// ─── Helpers ──────────────────────────────────────────
function formatMeetingDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    date.getFullYear() === tomorrow.getFullYear() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getDate() === tomorrow.getDate()

  if (isToday) return 'Today'
  if (isTomorrow) return 'Tomorrow'
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatMeetingTime(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ─── Component ────────────────────────────────────────
export function MeetingCard({
  meeting,
  memberMap,
  currentUserId,
  onEdit,
  onCancel,
}: MeetingCardProps) {
  const TypeIcon = MEETING_TYPE_ICONS[meeting.meeting_type] ?? Video
  const typeStyle = MEETING_TYPE_ICON_STYLES[meeting.meeting_type] ?? {
    icon: 'text-gray-600',
    bg: 'bg-gray-50',
  }
  const statusColor =
    MEETING_STATUS_COLORS[meeting.status as keyof typeof MEETING_STATUS_COLORS] ?? '#6B7280'

  const isHost = meeting.meeting_participants.some(
    (p) => p.user_id === currentUserId && p.role === 'host'
  )

  // Resolve participant names
  const resolvedParticipants = meeting.meeting_participants.map((p) => {
    const member = memberMap.get(p.user_id)
    return {
      userId: p.user_id,
      role: p.role,
      displayName: member?.display_name || 'Unknown',
    }
  })

  const participantNames = resolvedParticipants
    .slice(0, 3)
    .map((p) => p.displayName.split(' ')[0])
  const extraCount = resolvedParticipants.length - 3

  // Notes indicator
  const isCompleted = meeting.status === 'completed'
  const hasNotes = !!(meeting.summary || meeting.transcript)

  return (
    <div
      className={cn(
        'group/card rounded-lg border bg-white p-4 transition-all',
        'hover:shadow-md hover:-translate-y-0.5',
        meeting.status === 'cancelled' && 'opacity-60',
      )}
    >
      {/* Row 1: Icon + Title + Status + Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
              typeStyle.bg,
            )}
          >
            <TypeIcon className={cn('h-5 w-5', typeStyle.icon)} />
          </div>
          <div className="min-w-0">
            <Link
              href={`/meetings/${meeting.id}`}
              className="font-medium text-sm leading-tight hover:text-primary transition-colors truncate block"
            >
              {meeting.title}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                {MEETING_TYPE_LABELS[meeting.meeting_type as keyof typeof MEETING_TYPE_LABELS] ??
                  meeting.meeting_type}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status badge */}
          <Badge
            className="text-[10px] px-1.5 py-0 h-5 text-white border-0"
            style={{ backgroundColor: statusColor }}
          >
            {MEETING_STATUS_LABELS[meeting.status as keyof typeof MEETING_STATUS_LABELS] ??
              meeting.status}
          </Badge>

          {/* Quick actions dropdown */}
          {meeting.status !== 'cancelled' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 opacity-0 group-hover/card:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {(meeting.status === 'scheduled' || meeting.status === 'in_progress') && (
                  <DropdownMenuItem asChild>
                    <Link href={`/meetings/${meeting.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 mr-2" />
                      Join Meeting
                    </Link>
                  </DropdownMenuItem>
                )}
                {meeting.status === 'scheduled' && (
                  <DropdownMenuItem onClick={() => onEdit(meeting)}>
                    <Pencil className="h-3.5 w-3.5 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {meeting.status === 'completed' && (
                  <DropdownMenuItem asChild>
                    <Link href={`/meetings/${meeting.id}`}>
                      <FileText className="h-3.5 w-3.5 mr-2" />
                      View Notes
                    </Link>
                  </DropdownMenuItem>
                )}
                {meeting.status === 'scheduled' && isHost && (
                  <DropdownMenuItem
                    onClick={() => onCancel(meeting.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <XCircle className="h-3.5 w-3.5 mr-2" />
                    Cancel
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Row 2: Brand > Project context */}
      {(meeting.brands || meeting.projects) && (
        <div className="flex items-center gap-1 mt-2 ml-[52px] text-xs text-muted-foreground">
          {meeting.brands && (
            <span className="truncate">{meeting.brands.name}</span>
          )}
          {meeting.brands && meeting.projects && (
            <span className="text-muted-foreground/50">›</span>
          )}
          {meeting.projects && (
            <span className="truncate">{meeting.projects.name}</span>
          )}
        </div>
      )}

      {/* Row 3: Date / Time / Duration */}
      {meeting.scheduled_at && (
        <div className="flex items-center gap-4 mt-3 ml-[52px] text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 shrink-0" />
            <span>{formatMeetingDate(meeting.scheduled_at)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{formatMeetingTime(meeting.scheduled_at)}</span>
          </div>
          {meeting.duration_minutes && (
            <div className="flex items-center gap-1">
              <Timer className="h-3 w-3 shrink-0" />
              <span>{meeting.duration_minutes} min</span>
            </div>
          )}
        </div>
      )}

      {/* Row 4: Participants */}
      {resolvedParticipants.length > 0 && (
        <div className="flex items-center gap-2 mt-3 ml-[52px]">
          <div className="flex -space-x-1.5">
            {resolvedParticipants.slice(0, 5).map((p) => (
              <Tooltip key={p.userId}>
                <TooltipTrigger asChild>
                  <div>
                    <Avatar className="h-6 w-6 border-2 border-background">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary font-medium">
                        {getInitials(p.displayName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {p.displayName}
                  {p.role === 'host' && ' (Host)'}
                </TooltipContent>
              </Tooltip>
            ))}
            {resolvedParticipants.length > 5 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-medium">
                +{resolvedParticipants.length - 5}
              </div>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {participantNames.join(', ')}
            {extraCount > 0 && ` +${extraCount}`}
          </span>
        </div>
      )}

      {/* Row 5: Notes indicator (completed meetings only) */}
      {isCompleted && (
        <div className="mt-3 ml-[52px]">
          {hasNotes ? (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600">
              <FileText className="h-3 w-3" />
              <span>Notes available</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertCircle className="h-3 w-3" />
              <span>Pending notes</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
