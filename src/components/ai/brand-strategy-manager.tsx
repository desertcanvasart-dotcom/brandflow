'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Lightbulb, ChevronDown, Plus, Trash2, Loader2, Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'

// ── Types ───────────────────────────────────────────────────

interface ContentPillar {
  name: string
  description: string
  keywords: string[]
}

interface AudiencePersona {
  name: string
  demographics: string
  painPoints: string[]
  goals: string[]
  preferredPlatforms: string[]
}

interface ToneProfile {
  voice: string
  tone: string
  doList: string[]
  dontList: string[]
  samplePhrases: string[]
}

interface CampaignObjective {
  objective: string
  kpis: string[]
  targetDate?: string
  status: 'active' | 'completed' | 'paused'
}

// ── Helpers ─────────────────────────────────────────────────

function emptyPillar(): ContentPillar {
  return { name: '', description: '', keywords: [] }
}
function emptyPersona(): AudiencePersona {
  return { name: '', demographics: '', painPoints: [], goals: [], preferredPlatforms: [] }
}
function emptyTone(): ToneProfile {
  return { voice: '', tone: '', doList: [], dontList: [], samplePhrases: [] }
}
function emptyObjective(): CampaignObjective {
  return { objective: '', kpis: [], status: 'active' }
}

// ── Tag Input (comma-separated) ─────────────────────────────

function TagInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[]
  onChange: (v: string[]) => void
  placeholder?: string
}) {
  const [text, setText] = useState(value.join(', '))

  function handleBlur() {
    const tags = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    onChange(tags)
  }

  // Sync external changes
  useEffect(() => {
    setText(value.join(', '))
  }, [value])

  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      placeholder={placeholder || 'Comma-separated values'}
    />
  )
}

// ── Main Component ──────────────────────────────────────────

export function BrandStrategyManager() {
  const [brandId, setBrandId] = useState('')
  const [pillars, setPillars] = useState<ContentPillar[]>([])
  const [personas, setPersonas] = useState<AudiencePersona[]>([])
  const [tone, setTone] = useState<ToneProfile>(emptyTone())
  const [objectives, setObjectives] = useState<CampaignObjective[]>([])
  const [competitiveNotes, setCompetitiveNotes] = useState('')

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    pillars: true,
    personas: false,
    tone: false,
    objectives: false,
    notes: false,
  })

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: strategy, isLoading: isLoadingStrategy } = trpc.brandStrategy.getByBrand.useQuery(
    { brandId },
    { enabled: !!brandId },
  )

  const upsertMutation = trpc.brandStrategy.upsert.useMutation({
    onSuccess: () => toast.success('Brand strategy saved'),
    onError: (err) => toast.error(err.message || 'Failed to save strategy'),
  })

  // Load strategy when brand changes
  useEffect(() => {
    if (strategy) {
      setPillars((strategy.content_pillars as unknown as ContentPillar[]) || [])
      setPersonas((strategy.audience_personas as unknown as AudiencePersona[]) || [])
      setTone((strategy.tone_profiles as unknown as ToneProfile) || emptyTone())
      setObjectives((strategy.campaign_objectives as unknown as CampaignObjective[]) || [])
      setCompetitiveNotes(strategy.competitive_notes || '')
    } else if (brandId && !isLoadingStrategy) {
      // Reset for new brand with no strategy
      setPillars([])
      setPersonas([])
      setTone(emptyTone())
      setObjectives([])
      setCompetitiveNotes('')
    }
  }, [strategy, brandId, isLoadingStrategy])

  function toggleSection(key: string) {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function handleSave() {
    if (!brandId) {
      toast.error('Please select a brand')
      return
    }
    upsertMutation.mutate({
      brandId,
      contentPillars: pillars.filter((p) => p.name.trim()),
      audiencePersonas: personas.filter((p) => p.name.trim()),
      toneProfiles: tone,
      campaignObjectives: objectives.filter((o) => o.objective.trim()),
      competitiveNotes: competitiveNotes || null,
    })
  }

  // ── Pillar helpers ──

  function updatePillar(index: number, field: keyof ContentPillar, value: string | string[]) {
    setPillars((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  // ── Persona helpers ──

  function updatePersona(index: number, field: keyof AudiencePersona, value: string | string[]) {
    setPersonas((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  // ── Objective helpers ──

  function updateObjective(index: number, field: keyof CampaignObjective, value: string | string[]) {
    setObjectives((prev) => prev.map((o, i) => (i === index ? { ...o, [field]: value } : o)))
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-medium">Brand Strategy</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Define content pillars, audience personas, and tone profiles. These are automatically injected into all AI agents.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brand Select */}
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
        </div>

        {!brandId && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Select a brand to configure its strategy.
          </p>
        )}

        {brandId && isLoadingStrategy && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {brandId && !isLoadingStrategy && (
          <>
            {/* ── Content Pillars ──────────────────────────── */}
            <Collapsible open={openSections.pillars} onOpenChange={() => toggleSection('pillars')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Content Pillars ({pillars.length})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.pillars ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {pillars.map((pillar, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Pillar name"
                        value={pillar.name}
                        onChange={(e) => updatePillar(i, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPillars((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Description"
                      value={pillar.description}
                      onChange={(e) => updatePillar(i, 'description', e.target.value)}
                      rows={2}
                    />
                    <div>
                      <Label className="text-xs">Keywords</Label>
                      <TagInput
                        value={pillar.keywords}
                        onChange={(v) => updatePillar(i, 'keywords', v)}
                        placeholder="keyword1, keyword2, keyword3"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPillars((prev) => [...prev, emptyPillar()])}
                  className="w-full gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Pillar
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Audience Personas ────────────────────────── */}
            <Collapsible open={openSections.personas} onOpenChange={() => toggleSection('personas')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Audience Personas ({personas.length})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.personas ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {personas.map((persona, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Persona name (e.g. Marketing Manager Maria)"
                        value={persona.name}
                        onChange={(e) => updatePersona(i, 'name', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setPersonas((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Demographics (e.g. 28-40, female, urban, mid-career)"
                      value={persona.demographics}
                      onChange={(e) => updatePersona(i, 'demographics', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Pain Points</Label>
                        <TagInput
                          value={persona.painPoints}
                          onChange={(v) => updatePersona(i, 'painPoints', v)}
                          placeholder="pain point 1, pain point 2"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Goals</Label>
                        <TagInput
                          value={persona.goals}
                          onChange={(v) => updatePersona(i, 'goals', v)}
                          placeholder="goal 1, goal 2"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Preferred Platforms</Label>
                      <TagInput
                        value={persona.preferredPlatforms}
                        onChange={(v) => updatePersona(i, 'preferredPlatforms', v)}
                        placeholder="instagram, linkedin, tiktok"
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPersonas((prev) => [...prev, emptyPersona()])}
                  className="w-full gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Persona
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Tone & Voice ────────────────────────────── */}
            <Collapsible open={openSections.tone} onOpenChange={() => toggleSection('tone')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Tone & Voice</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.tone ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Voice</Label>
                    <Input
                      placeholder="e.g. Authoritative, Friendly, Witty"
                      value={tone.voice}
                      onChange={(e) => setTone((prev) => ({ ...prev, voice: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tone</Label>
                    <Input
                      placeholder="e.g. Professional, Casual, Inspiring"
                      value={tone.tone}
                      onChange={(e) => setTone((prev) => ({ ...prev, tone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Do&apos;s</Label>
                    <TagInput
                      value={tone.doList}
                      onChange={(v) => setTone((prev) => ({ ...prev, doList: v }))}
                      placeholder="use active voice, be concise"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Don&apos;ts</Label>
                    <TagInput
                      value={tone.dontList}
                      onChange={(v) => setTone((prev) => ({ ...prev, dontList: v }))}
                      placeholder="avoid jargon, no slang"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sample Phrases</Label>
                  <TagInput
                    value={tone.samplePhrases}
                    onChange={(v) => setTone((prev) => ({ ...prev, samplePhrases: v }))}
                    placeholder="Let's build something great, Your success matters"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Campaign Objectives ─────────────────────── */}
            <Collapsible open={openSections.objectives} onOpenChange={() => toggleSection('objectives')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Campaign Objectives ({objectives.length})</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.objectives ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {objectives.map((obj, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Objective (e.g. Increase brand awareness by 30%)"
                        value={obj.objective}
                        onChange={(e) => updateObjective(i, 'objective', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => setObjectives((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">KPIs</Label>
                        <TagInput
                          value={obj.kpis}
                          onChange={(v) => updateObjective(i, 'kpis', v)}
                          placeholder="impressions, CTR, conversions"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Target Date</Label>
                          <Input
                            type="date"
                            value={obj.targetDate || ''}
                            onChange={(e) => updateObjective(i, 'targetDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Status</Label>
                          <Select
                            value={obj.status}
                            onValueChange={(v) => updateObjective(i, 'status', v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="paused">Paused</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setObjectives((prev) => [...prev, emptyObjective()])}
                  className="w-full gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Objective
                </Button>
              </CollapsibleContent>
            </Collapsible>

            {/* ── Competitive Notes ───────────────────────── */}
            <Collapsible open={openSections.notes} onOpenChange={() => toggleSection('notes')}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Competitive Notes</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openSections.notes ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Textarea
                  placeholder="Free-form notes on competitors, market positioning, and differentiators..."
                  value={competitiveNotes}
                  onChange={(e) => setCompetitiveNotes(e.target.value)}
                  rows={4}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* ── Save Button ────────────────────────────── */}
            <Button
              onClick={handleSave}
              disabled={upsertMutation.isPending}
              className="w-full"
            >
              {upsertMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Strategy
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
