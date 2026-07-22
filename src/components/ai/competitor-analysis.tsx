'use client'

import { useState, useCallback } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Target, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import { AIOutputDisplay } from './ai-output-display'
import { BrandContextBanner } from './brand-context-banner'

const ANALYSIS_FOCUS_OPTIONS = [
  { value: 'general', label: 'General Overview' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'content_strategy', label: 'Content Strategy' },
  { value: 'positioning', label: 'Brand Positioning' },
]

const COMPETITOR_SUGGESTIONS = [
  'CompetitorA.com\nCompetitorB.com',
  'Analyze top 3 brands in our industry',
]

export function CompetitorAnalysis() {
  const [brandId, setBrandId] = useState('')
  const [competitors, setCompetitors] = useState('')
  const [analysisFocus, setAnalysisFocus] = useState('general')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)

  const { data: brands } = trpc.brand.list.useQuery()

  const { isLoading, complete } = useCompletion({
    api: '/api/ai/competitor-analysis',
    streamProtocol: 'text',
    body: { brandId: brandId || undefined, competitors, analysisFocus },
    onFinish: (_prompt, completion) => {
      setVariations((prev) => {
        const next = [...prev, completion]
        setActiveVariation(next.length - 1)
        return next.length > 5 ? next.slice(-5) : next
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to analyze competitors'),
  })

  const handleAnalyze = useCallback(async () => {
    if (!brandId) {
      toast.error('Please select a brand')
      return
    }
    if (!competitors.trim()) {
      toast.error('Please enter at least one competitor')
      return
    }
    await complete(competitors)
  }, [brandId, competitors, complete])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-red-500" />
          <CardTitle className="text-sm font-medium">Competitor Analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Your Brand</Label>
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
          <Label>Competitors</Label>
          <Textarea
            placeholder="Enter competitor names or URLs, one per line:&#10;e.g.&#10;CompetitorA - https://competitora.com&#10;CompetitorB - https://competitorb.com"
            value={competitors}
            onChange={(e) => setCompetitors(e.target.value)}
            rows={4}
          />
          <div className="flex flex-wrap gap-1.5">
            {COMPETITOR_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setCompetitors(s)}
                className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
              >
                {s.replace('\n', ', ')}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Analysis Focus</Label>
          <Select value={analysisFocus} onValueChange={setAnalysisFocus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ANALYSIS_FOCUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleAnalyze} disabled={isLoading || !brandId || !competitors.trim()} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Run Competitor Analysis
            </>
          )}
        </Button>

        <AIOutputDisplay
          variations={variations}
          activeVariation={activeVariation}
          onVariationChange={setActiveVariation}
          onClear={() => { setVariations([]); setActiveVariation(0) }}
          isStreaming={isLoading}
          agentType="competitor_analysis"
          brandId={brandId || undefined}
          inputSummary={`Competitors (${analysisFocus}): ${competitors.slice(0, 80)}`}
          metadata={{ analysisFocus }}
        />
      </CardContent>
    </Card>
  )
}
