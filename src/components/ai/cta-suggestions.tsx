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
import { MousePointerClick, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import { AIOutputDisplay } from './ai-output-display'
import { BrandContextBanner } from './brand-context-banner'

const PLACEMENTS = [
  { value: 'button', label: 'Button' },
  { value: 'banner', label: 'Banner / Hero' },
  { value: 'email', label: 'Email CTA' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'social', label: 'Social Media' },
  { value: 'popup', label: 'Popup / Modal' },
]

const PROMPT_SUGGESTIONS = [
  'Drive free trial signups',
  'Increase newsletter subscriptions',
  'Boost demo bookings for SaaS',
]

export function CtaSuggestions() {
  const [brandId, setBrandId] = useState('')
  const [context, setContext] = useState('')
  const [purpose, setPurpose] = useState('')
  const [placement, setPlacement] = useState('button')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)

  const { data: brands } = trpc.brand.list.useQuery()

  const { isLoading, complete } = useCompletion({
    api: '/api/ai/generate-cta',
    streamProtocol: 'text',
    body: { brandId: brandId || undefined, context, placement },
    onFinish: (_prompt, completion) => {
      setVariations((prev) => {
        const next = [...prev, completion]
        setActiveVariation(next.length - 1)
        return next.length > 5 ? next.slice(-5) : next
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate CTAs'),
  })

  const handleGenerate = useCallback(async () => {
    if (!purpose.trim()) {
      toast.error('Please describe the CTA purpose')
      return
    }
    await complete(purpose)
  }, [purpose, complete])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MousePointerClick className="h-4 w-4 text-emerald-500" />
          <CardTitle className="text-sm font-medium">CTA Suggestions</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a brand (optional)..." />
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
          <Label>Industry / Context</Label>
          <Textarea
            placeholder="e.g. B2B SaaS for project management, targeting mid-size companies..."
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>CTA Purpose</Label>
          <Textarea
            placeholder="e.g. Drive free trial signups from the landing page hero section..."
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={2}
          />
          <div className="flex flex-wrap gap-1.5">
            {PROMPT_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPurpose(s)}
                className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Placement</Label>
          <Select value={placement} onValueChange={setPlacement}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLACEMENTS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={handleGenerate} disabled={isLoading || !purpose.trim()} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate CTAs
            </>
          )}
        </Button>

        <AIOutputDisplay
          variations={variations}
          activeVariation={activeVariation}
          onVariationChange={setActiveVariation}
          onClear={() => { setVariations([]); setActiveVariation(0) }}
          isStreaming={isLoading}
          agentType="cta_suggestion"
          brandId={brandId || undefined}
          inputSummary={`CTA (${placement}): ${purpose.slice(0, 80)}`}
          metadata={{ placement, context }}
        />
      </CardContent>
    </Card>
  )
}
