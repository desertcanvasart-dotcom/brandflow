'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MeetingChatProps {
  sessionId: string
}

interface ChatMessage {
  id: string
  sender: string
  text: string
  timestamp: Date
}

export function MeetingChat({ sessionId }: MeetingChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    if (!input.trim()) return

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'You',
      text: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newMessage])
    setInput('')

    // TODO: In a full implementation, this would broadcast via LiveKit data channels
    // or a real-time system like Supabase Realtime
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Start chatting with other participants.
          </p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-xs">{msg.sender}</span>
                <span className="text-[10px] text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-muted-foreground">{msg.text}</p>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="border-t p-2 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="h-8 text-sm"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={handleSend}
          disabled={!input.trim()}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
