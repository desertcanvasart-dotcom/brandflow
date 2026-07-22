'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { RepeaterField, MultiSelectField } from '../form-fields'
import { CHANNEL_OPTIONS, type CompetitorData } from '@/types/kb-forms'

interface CompetitorFormProps {
  value: CompetitorData
  onChange: (value: CompetitorData) => void
}

const THREAT_OPTIONS: { value: CompetitorData['threatLevel']; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

export function CompetitorForm({ value, onChange }: CompetitorFormProps) {
  function update<K extends keyof CompetitorData>(field: K, val: CompetitorData[K]) {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Company Name</Label>
          <Input
            value={value.companyName}
            onChange={(e) => update('companyName', e.target.value)}
            placeholder="e.g., Acme Corp"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Website</Label>
          <Input
            value={value.website}
            onChange={(e) => update('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Industry</Label>
          <Input
            value={value.industry}
            onChange={(e) => update('industry', e.target.value)}
            placeholder="e.g., SaaS, E-commerce"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Price Range</Label>
          <Input
            value={value.priceRange}
            onChange={(e) => update('priceRange', e.target.value)}
            placeholder="e.g., $29-99/mo"
          />
        </div>
      </div>

      <RepeaterField
        label="Strengths"
        value={value.strengths}
        onChange={(v) => update('strengths', v)}
        placeholder="Add a strength…"
      />

      <RepeaterField
        label="Weaknesses"
        value={value.weaknesses}
        onChange={(v) => update('weaknesses', v)}
        placeholder="Add a weakness…"
      />

      <MultiSelectField
        label="Active Channels"
        options={CHANNEL_OPTIONS}
        value={value.channels}
        onChange={(v) => update('channels', v)}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Positioning</Label>
        <Textarea
          value={value.positioning}
          onChange={(e) => update('positioning', e.target.value)}
          placeholder="How do they position themselves in the market?"
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={value.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Additional observations…"
          className="min-h-[60px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Threat Level</Label>
        <RadioGroup
          value={value.threatLevel}
          onValueChange={(v) => update('threatLevel', v as CompetitorData['threatLevel'])}
          className="flex gap-4"
        >
          {THREAT_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`threat-${opt.value}`} />
              <Label htmlFor={`threat-${opt.value}`} className="text-xs font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
