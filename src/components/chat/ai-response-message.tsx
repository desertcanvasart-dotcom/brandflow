'use client'

import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import type { Database } from '@/types/database'

type MessageRow = Database['public']['Tables']['channel_messages']['Row']

interface AIResponseMessageProps {
  message: MessageRow
}

export function AIResponseMessage({ message }: AIResponseMessageProps) {
  const attachments = (typeof message.attachments === 'string'
    ? JSON.parse(message.attachments)
    : message.attachments) as Array<{ type: string; command?: string; label?: string }>

  const aiMeta = attachments?.[0]
  const label = aiMeta?.label ?? 'AI Response'

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="mx-4 my-2 rounded-lg border bg-muted/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
        </div>
        <span className="text-xs font-semibold text-primary">AI</span>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">{time}</span>
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-4">
        <ReactMarkdown>{message.content}</ReactMarkdown>
      </div>
    </div>
  )
}
