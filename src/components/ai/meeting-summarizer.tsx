'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

interface MeetingSummarizerProps {
  meetingId: string
  transcript: string | null
  meetingType?: string
  projectType?: string
  brandName?: string
  existingSummary?: string | null
}

export function MeetingSummarizer({
  meetingId, transcript, meetingType, projectType, brandName, existingSummary,
}: MeetingSummarizerProps) {
  const [copied, setCopied] = useState(false)

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/ai/summarize',
    body: { meetingId, meetingType, projectType, brandName },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate summary'),
  })

  const summary = completion || existingSummary

  async function handleSummarize() {
    if (!transcript) {
      toast.error('No transcript available to summarize')
      return
    }
    await complete(transcript)
  }

  async function handleCopy() {
    if (!summary) return
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    toast.success('Summary copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-sm font-medium">AI Summary</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {summary && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSummarize}
              disabled={isLoading || !transcript}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {existingSummary ? 'Re-summarize' : 'Generate Summary'}
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {summary ? (
          <div className="prose prose-sm max-w-none">
            <p className="text-sm whitespace-pre-wrap">{summary}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {transcript
              ? 'Click "Generate Summary" to create an AI-powered summary of this meeting.'
              : 'A transcript is needed before generating a summary.'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
