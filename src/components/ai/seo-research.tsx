'use client'

import { useState, useCallback } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import { AIOutputDisplay } from './ai-output-display'
import { BrandContextBanner } from './brand-context-banner'

const TOPIC_SUGGESTIONS = [
  'Content marketing strategy',
  'Local SEO for small business',
  'E-commerce product page optimization',
]

export function SeoResearch() {
  const [brandId, setBrandId] = useState('')
  const [focusTopic, setFocusTopic] = useState('')
  const [focusUrl, setFocusUrl] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)

  const { data: brands } = trpc.brand.list.useQuery()

  const { isLoading, complete } = useCompletion({
    api: '/api/ai/seo-research',
    streamProtocol: 'text',
    body: { brandId: brandId || undefined, focusTopic, focusUrl },
    onFinish: (_prompt, completion) => {
      setVariations((prev) => {
        const next = [...prev, completion]
        setActiveVariation(next.length - 1)
        return next.length > 5 ? next.slice(-5) : next
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to run SEO research'),
  })

  const handleAnalyze = useCallback(async () => {
    if (!brandId) {
      toast.error('Please select a brand')
      return
    }
    await complete(focusTopic || 'General SEO analysis')
  }, [brandId, focusTopic, complete])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-cyan-500" />
          <CardTitle className="text-sm font-medium">SEO Research</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a brand..." />
            </SelectTrigger>
            <SelectContent>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandId && <BrandContextBanner brandId={brandId} />}
        </div>

        <div className="space-y-2">
          <Label>Focus Topic (optional)</Label>
          <Input
            placeholder="e.g. content marketing, SaaS pricing, social media strategy..."
            value={focusTopic}
            onChange={(e) => setFocusTopic(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {TOPIC_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setFocusTopic(s)}
                className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Focus URL (optional)</Label>
          <Input
            placeholder="e.g. https://example.com/blog/article"
            value={focusUrl}
            onChange={(e) => setFocusUrl(e.target.value)}
          />
        </div>

        <Button onClick={handleAnalyze} disabled={isLoading || !brandId} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run SEO Research
            </>
          )}
        </Button>

        <AIOutputDisplay
          variations={variations}
          activeVariation={activeVariation}
          onVariationChange={setActiveVariation}
          onClear={() => { setVariations([]); setActiveVariation(0) }}
          isStreaming={isLoading}
          agentType="seo_research"
          brandId={brandId || undefined}
          inputSummary={`SEO: ${(focusTopic || focusUrl || 'general').slice(0, 100)}`}
          metadata={{ focusTopic, focusUrl }}
        />
      </CardContent>
    </Card>
  )
}
