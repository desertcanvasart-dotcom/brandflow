'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Loader2, Sparkles, ClipboardPlus, ListTodo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TranscriptChatProps {
  sessionId?: string
  projectId?: string
  className?: string
  /** Compact mode for sidebar embedding */
  compact?: boolean
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface ParsedAction {
  type: 'ADD_TO_BRIEF' | 'CREATE_TASK'
  content: string
  assignee?: string
  priority?: string
}

function parseActions(text: string): ParsedAction[] {
  const actions: ParsedAction[] = []

  const briefMatches = text.matchAll(/\[ADD_TO_BRIEF:\s*(.*?)\]/g)
  for (const match of briefMatches) {
    actions.push({ type: 'ADD_TO_BRIEF', content: match[1].trim() })
  }

  const taskMatches = text.matchAll(/\[CREATE_TASK:\s*(.*?)\]/g)
  for (const match of taskMatches) {
    const parts = match[1].split('|').map((p) => p.trim())
    const content = parts[0]
    const assignee = parts.find((p) => p.startsWith('assignee:'))?.replace('assignee:', '').trim()
    const priority = parts.find((p) => p.startsWith('priority:'))?.replace('priority:', '').trim()
    actions.push({ type: 'CREATE_TASK', content, assignee, priority })
  }

  return actions
}

function stripActions(text: string): string {
  return text
    .replace(/\[ADD_TO_BRIEF:\s*.*?\]/g, '')
    .replace(/\[CREATE_TASK:\s*.*?\]/g, '')
    .trim()
}

export function TranscriptChat({ sessionId, projectId, className, compact = false }: TranscriptChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    const question = input.trim()
    if (!question || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/ai/transcript-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, sessionId, projectId }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        setMessages((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: 'assistant', content: errorText || 'Failed to get response' },
        ])
        return
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const assistantId = `assistant-${Date.now()}`
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      const decoder = new TextDecoder()
      let accumulated = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        const content = accumulated
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)))
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, role: 'assistant', content: 'An error occurred. Please try again.' },
      ])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, sessionId, projectId])

  const handleAddToBrief = async (content: string) => {
    if (!projectId && !sessionId) {
      toast.error('No project context available')
      return
    }
    setActionLoading(`brief-${content}`)
    try {
      const res = await fetch('/api/ai/transcript-chat/add-to-brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, projectId, sessionId }),
      })
      if (!res.ok) throw new Error('Failed to add to brief')
      toast.success('Added to project brief')
    } catch {
      toast.error('Failed to add to brief')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {!compact && (
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">Transcript Chat</h3>
          <span className="text-xs text-muted-foreground">
            {sessionId ? 'This Session' : 'All Project Meetings'}
          </span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className={cn('space-y-4', compact ? 'p-2' : 'p-4')}>
          {messages.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <div>
                <p className="text-sm text-muted-foreground">
                  Ask questions about {sessionId ? 'this meeting' : 'your project meetings'}
                </p>
                <div className="mt-3 space-y-1.5">
                  {['What were the key decisions made?', 'Summarize the action items', 'What did the client say about the timeline?'].map(
                    (suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="block w-full text-left text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md hover:bg-accent transition-colors"
                      >
                        &quot;{suggestion}&quot;
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === 'user'
              const actions = !isUser ? parseActions(msg.content) : []
              const displayContent = !isUser ? stripActions(msg.content) : msg.content

              return (
                <div key={msg.id} className={cn('flex gap-2', isUser && 'justify-end')}>
                  {!isUser && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div className={cn('max-w-[85%] space-y-2', isUser && 'order-first')}>
                    <div className={cn('rounded-lg px-3 py-2 text-sm', isUser ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted')}>
                      <div className="whitespace-pre-wrap break-words prose prose-sm dark:prose-invert max-w-none [&>p]:my-1">
                        {displayContent}
                      </div>
                    </div>
                    {actions.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        {actions.map((action, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              if (action.type === 'ADD_TO_BRIEF') handleAddToBrief(action.content)
                              else toast.info(`Task noted: "${action.content}"${action.assignee ? ` for ${action.assignee}` : ''}`)
                            }}
                            disabled={actionLoading === `brief-${action.content}`}
                            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded transition-colors disabled:opacity-50"
                          >
                            {action.type === 'ADD_TO_BRIEF' ? (
                              <>
                                <ClipboardPlus className="h-3 w-3" />
                                Add to Brief: {action.content.substring(0, 60)}{action.content.length > 60 ? '...' : ''}
                              </>
                            ) : (
                              <>
                                <ListTodo className="h-3 w-3" />
                                Create Task: {action.content.substring(0, 60)}{action.content.length > 60 ? '...' : ''}
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {isUser && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 mt-0.5">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              )
            })
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analyzing transcript...
            </div>
          )}
        </div>
      </div>

      <div className={cn('border-t', compact ? 'p-2' : 'p-3')}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about the transcript..."
            className={cn(compact ? 'h-8 text-xs' : 'h-9 text-sm')}
            disabled={isLoading}
          />
          <Button type="submit" variant="ghost" size="sm" className={cn(compact ? 'h-8 w-8' : 'h-9 w-9', 'p-0 shrink-0')} disabled={!input.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
