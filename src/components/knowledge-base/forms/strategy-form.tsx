'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { RepeaterField, MultiSelectField } from '../form-fields'
import { CHANNEL_OPTIONS, type StrategyData } from '@/types/kb-forms'

interface StrategyFormProps {
  value: StrategyData
  onChange: (value: StrategyData) => void
}

const OBJECTIVE_OPTIONS: { value: StrategyData['objectiveType']; label: string }[] = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'retention', label: 'Retention' },
]

export function StrategyForm({ value, onChange }: StrategyFormProps) {
  function update<K extends keyof StrategyData>(field: K, val: StrategyData[K]) {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-xs">Objective Type</Label>
        <RadioGroup
          value={value.objectiveType}
          onValueChange={(v) => update('objectiveType', v as StrategyData['objectiveType'])}
          className="flex flex-wrap gap-3"
        >
          {OBJECTIVE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`obj-${opt.value}`} />
              <Label htmlFor={`obj-${opt.value}`} className="text-xs font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Target Audience</Label>
        <Input
          value={value.targetAudience}
          onChange={(e) => update('targetAudience', e.target.value)}
          placeholder="Who is this strategy for?"
        />
      </div>

      <MultiSelectField
        label="Channels"
        options={CHANNEL_OPTIONS}
        value={value.channels}
        onChange={(v) => update('channels', v)}
      />

      <RepeaterField
        label="Key Messages"
        value={value.keyMessages}
        onChange={(v) => update('keyMessages', v)}
        placeholder="Add a key message…"
      />

      <RepeaterField
        label="KPIs"
        value={value.kpis}
        onChange={(v) => update('kpis', v)}
        placeholder="Add a KPI…"
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Timeline</Label>
          <Input
            value={value.timeline}
            onChange={(e) => update('timeline', e.target.value)}
            placeholder="e.g., Q2 2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Budget</Label>
          <Input
            value={value.budget}
            onChange={(e) => update('budget', e.target.value)}
            placeholder="e.g., $50,000"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Competitive Position</Label>
        <Textarea
          value={value.competitivePosition}
          onChange={(e) => update('competitivePosition', e.target.value)}
          placeholder="How does this strategy differentiate from competitors?"
          className="min-h-[60px]"
        />
      </div>
    </div>
  )
}
