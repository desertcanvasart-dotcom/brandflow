'use client'

import { useState, useCallback } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel,
  SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Megaphone, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import { AIOutputDisplay } from './ai-output-display'
import { BrandContextBanner } from './brand-context-banner'

const AD_PLATFORMS = [
  { value: 'meta_ads', label: 'Meta Ads (Facebook/Instagram)' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'linkedin_ads', label: 'LinkedIn Ads' },
  { value: 'tiktok_ads', label: 'TikTok Ads' },
  { value: 'twitter_ads', label: 'X (Twitter) Ads' },
  { value: 'youtube_ads', label: 'YouTube Ads' },
]

const ORGANIC_PLATFORMS = [
  { value: 'instagram', label: 'Instagram (Organic)' },
  { value: 'facebook', label: 'Facebook (Organic)' },
  { value: 'linkedin', label: 'LinkedIn (Organic)' },
  { value: 'blog', label: 'Blog Post' },
  { value: 'newsletter', label: 'Newsletter' },
]

const OBJECTIVE_SUGGESTIONS = [
  'Launch a new product to young professionals',
  'Re-engage dormant customers with a special offer',
  'Build brand awareness in a new market',
]

export function AdCopyGenerator() {
  const [brandId, setBrandId] = useState('')
  const [objective, setObjective] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [platform, setPlatform] = useState('meta_ads')
  const [cta, setCta] = useState('')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)

  const { data: brands } = trpc.brand.list.useQuery()

  const { isLoading, complete } = useCompletion({
    api: '/api/ai/generate-ad-copy',
    streamProtocol: 'text',
    body: { brandId: brandId || undefined, targetAudience, platform, cta },
    onFinish: (_prompt, completion) => {
      setVariations((prev) => {
        const next = [...prev, completion]
        setActiveVariation(next.length - 1)
        return next.length > 5 ? next.slice(-5) : next
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate ad copy'),
  })

  const handleGenerate = useCallback(async () => {
    if (!objective.trim()) {
      toast.error('Please describe your campaign objective')
      return
    }
    await complete(objective)
  }, [objective, complete])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-sm font-medium">Ad Copy Generator</CardTitle>
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
          <Label>Platform</Label>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Ad Platforms</SelectLabel>
                {AD_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Organic Content</SelectLabel>
                {ORGANIC_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Campaign Objective</Label>
          <Textarea
            placeholder="e.g. Drive sign-ups for our new product launch targeting young professionals..."
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-1.5">
            {OBJECTIVE_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setObjective(s)}
                className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full hover:bg-muted/80 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Target Audience</Label>
          <Textarea
            placeholder="e.g. 25-35 year old professionals interested in productivity tools..."
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Desired CTA</Label>
          <Input
            placeholder="e.g. Sign Up Free, Learn More, Shop Now..."
            value={cta}
            onChange={(e) => setCta(e.target.value)}
          />
        </div>

        <Button onClick={handleGenerate} disabled={isLoading || !objective.trim()} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Ad Copy
            </>
          )}
        </Button>

        <AIOutputDisplay
          variations={variations}
          activeVariation={activeVariation}
          onVariationChange={setActiveVariation}
          onClear={() => { setVariations([]); setActiveVariation(0) }}
          isStreaming={isLoading}
          agentType="ad_copy"
          brandId={brandId || undefined}
          inputSummary={`${platform}: ${objective.slice(0, 100)}`}
          metadata={{ platform, targetAudience, cta }}
        />
      </CardContent>
    </Card>
  )
}
