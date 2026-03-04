'use client'

import { useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { FileText, Loader2, Sparkles, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { BRIEF_TYPE_LABELS } from '@/lib/constants'
import type { Database } from '@/types/database'

type BriefType = Database['public']['Enums']['brief_type']

const BRIEF_TYPES: BriefType[] = ['content_brief', 'project_requirements', 'change_request']

interface BriefGeneratorProps {
  meetingSummary: string
  projectType?: string
  brandGuidelines?: string
  onBriefGenerated?: (brief: string) => void
}

export function BriefGenerator({
  meetingSummary, projectType, brandGuidelines, onBriefGenerated,
}: BriefGeneratorProps) {
  const [briefType, setBriefType] = useState<BriefType>('content_brief')
  const [copied, setCopied] = useState(false)

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/ai/generate-brief',
    body: { projectType, brandGuidelines, briefType },
    onFinish: (_: string, completion: string) => {
      onBriefGenerated?.(completion)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate brief'),
  })

  async function handleGenerate() {
    if (!meetingSummary) {
      toast.error('A meeting summary is needed to generate a brief')
      return
    }
    await complete(meetingSummary)
  }

  async function handleCopy() {
    if (!completion) return
    await navigator.clipboard.writeText(completion)
    setCopied(true)
    toast.success('Brief copied')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-blue-500" />
          <CardTitle className="text-sm font-medium">Brief Generator</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="space-y-2 flex-1">
            <Label>Brief Type</Label>
            <Select value={briefType} onValueChange={(v) => setBriefType(v as BriefType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BRIEF_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BRIEF_TYPE_LABELS[type] || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerate} disabled={isLoading || !meetingSummary}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Brief
              </>
            )}
          </Button>
        </div>

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
