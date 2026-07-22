'use client'

import { CheckCircle2, UserPlus, Video, FileText, CheckSquare, Target, Pin } from 'lucide-react'
import type { Database } from '@/types/database'

type MessageRow = Database['public']['Tables']['channel_messages']['Row']

interface SystemMessageProps {
  message: MessageRow
}

const EVENT_ICONS: Record<string, typeof CheckCircle2> = {
  task_completed: CheckCircle2,
  member_joined: UserPlus,
  meeting_completed: Video,
  brief_submitted: FileText,
  task_created_from_chat: CheckSquare,
  decision_marked: Target,
  message_pinned: Pin,
}

export function SystemMessage({ message }: SystemMessageProps) {
  const attachments = (typeof message.attachments === 'string'
    ? JSON.parse(message.attachments)
    : message.attachments) as Array<{ type: string; event?: string }>

  const event = attachments?.[0]?.event ?? ''
  const Icon = EVENT_ICONS[event]

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{message.content}</span>
        <span className="text-muted-foreground/50">{time}</span>
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
