'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { PenTool, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { PLATFORM_LABELS } from '@/lib/constants'

import type { ContentPlatform } from '@/types/enums'

const PLATFORMS: ContentPlatform[] = ['instagram', 'facebook', 'linkedin', 'twitter', 'tiktok', 'blog', 'newsletter', 'other']

interface ContentDrafterProps {
  defaultBrief?: string
  brandGuidelines?: string
  brandVoice?: string
  onDraftGenerated?: (draft: string) => void
}

export function ContentDrafter({
  defaultBrief, brandGuidelines, brandVoice, onDraftGenerated,
}: ContentDrafterProps) {
  const [brief, setBrief] = useState(defaultBrief || '')
  const [platform, setPlatform] = useState('instagram')
  const [copied, setCopied] = useState(false)

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/ai/draft-content',
    streamProtocol: 'text',
    body: { platform, brandGuidelines, brandVoice },
    onFinish: (_: string, completion: string) => {
      onDraftGenerated?.(completion)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to draft content'),
  })

  async function handleDraft() {
    if (!brief.trim()) {
      toast.error('Please provide a brief to generate content')
      return
    }
    await complete(brief)
  }

  async function handleCopy() {
    if (!completion) return
    await navigator.clipboard.writeText(completion)
    setCopied(true)
    toast.success('Draft copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PenTool className="h-4 w-4 text-green-500" />
          <CardTitle className="text-sm font-medium">Content Drafter</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p] || p.charAt(0).toUpperCase() + p.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Brief / Instructions</Label>
          <Textarea
            placeholder="Describe what content you want to create..."
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleDraft} disabled={isLoading || !brief.trim()} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Drafting...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Draft
            </>
          )}
        </Button>

        {completion && (
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopy}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm whitespace-pre-wrap pr-10">{completion}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
