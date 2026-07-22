'use client'

import { useState } from 'react'
import { X, Users, FileText, StickyNote, MessageSquare, Brain } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ParticipantList } from './participant-list'
import { MeetingNotes } from './meeting-notes'
import { LiveTranscript } from './live-transcript'
import { MeetingChat } from './meeting-chat'
import { TranscriptChat } from './transcript-chat'

interface MeetingSidebarProps {
  sessionId: string
  roomId?: string
  projectId?: string
  onClose?: () => void
}

export function MeetingSidebar({ sessionId, roomId, projectId, onClose }: MeetingSidebarProps) {
  const [activeTab, setActiveTab] = useState('participants')

  return (
    <div className="w-[360px] border-l flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <h3 className="text-sm font-medium">Meeting Panel</h3>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose} style={{ display: onClose ? undefined : 'none' }}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="mx-2 mt-2 grid grid-cols-5">
          <TabsTrigger value="participants" className="text-xs px-1">
            <Users className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="transcript" className="text-xs px-1">
            <FileText className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="notes" className="text-xs px-1">
            <StickyNote className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="chat" className="text-xs px-1">
            <MessageSquare className="h-3.5 w-3.5" />
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs px-1">
            <Brain className="h-3.5 w-3.5" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="flex-1 overflow-auto p-3 mt-0">
          <ParticipantList sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="transcript" className="flex-1 overflow-auto p-3 mt-0">
          <LiveTranscript sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="notes" className="flex-1 overflow-auto p-3 mt-0">
          <MeetingNotes sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="chat" className="flex-1 overflow-auto mt-0">
          <MeetingChat sessionId={sessionId} />
        </TabsContent>

        <TabsContent value="ai" className="flex-1 overflow-hidden mt-0">
          <TranscriptChat
            sessionId={sessionId}
            projectId={projectId}
            compact
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
