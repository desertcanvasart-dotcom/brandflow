'use client'

import { FileText, MessageSquare } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { TranscriptChat } from './transcript-chat'

interface SessionTranscriptChatProps {
  sessionId: string
  projectId?: string
  transcriptText?: string | null
  summary?: string | null
}

/**
 * Per-session chat wrapper — shows transcript on the left, chat on the right.
 * For use in the session detail page or expanded sidebar view.
 */
export function SessionTranscriptChat({
  sessionId,
  projectId,
  transcriptText,
  summary,
}: SessionTranscriptChatProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[600px]">
      {/* Left: Transcript & Summary */}
      <div className="border rounded-lg overflow-hidden flex flex-col">
        <Tabs defaultValue={transcriptText ? 'transcript' : 'summary'} className="flex flex-col h-full">
          <div className="border-b px-3">
            <TabsList className="h-9 bg-transparent">
              {transcriptText && (
                <TabsTrigger value="transcript" className="text-xs">
                  <FileText className="mr-1.5 h-3 w-3" />
                  Transcript
                </TabsTrigger>
              )}
              {summary && (
                <TabsTrigger value="summary" className="text-xs">
                  <MessageSquare className="mr-1.5 h-3 w-3" />
                  Summary
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          {transcriptText && (
            <TabsContent value="transcript" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4 text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                  {transcriptText}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
          {summary && (
            <TabsContent value="summary" className="flex-1 overflow-hidden m-0">
              <ScrollArea className="h-full">
                <div className="p-4 text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                  {summary}
                </div>
              </ScrollArea>
            </TabsContent>
          )}
          {!transcriptText && !summary && (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
              No transcript or summary available yet.
            </div>
          )}
        </Tabs>
      </div>

      {/* Right: AI Chat */}
      <div className="border rounded-lg overflow-hidden">
        <TranscriptChat sessionId={sessionId} projectId={projectId} />
      </div>
    </div>
  )
}
