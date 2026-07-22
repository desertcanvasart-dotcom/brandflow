'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { RepeaterField, MultiSelectField } from '../form-fields'
import { CHANNEL_OPTIONS, type CampaignData } from '@/types/kb-forms'

interface CampaignFormProps {
  value: CampaignData
  onChange: (value: CampaignData) => void
}

const RATING_OPTIONS: { value: CampaignData['overallRating']; label: string }[] = [
  { value: 'poor', label: '⭐ Poor' },
  { value: 'fair', label: '⭐⭐ Fair' },
  { value: 'good', label: '⭐⭐⭐ Good' },
  { value: 'great', label: '⭐⭐⭐⭐ Great' },
  { value: 'excellent', label: '⭐⭐⭐⭐⭐ Excellent' },
]

export function CampaignForm({ value, onChange }: CampaignFormProps) {
  function update<K extends keyof CampaignData>(field: K, val: CampaignData[K]) {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Campaign Name</Label>
          <Input
            value={value.campaignName}
            onChange={(e) => update('campaignName', e.target.value)}
            placeholder="e.g., Summer Sale 2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Objective</Label>
          <Input
            value={value.objective}
            onChange={(e) => update('objective', e.target.value)}
            placeholder="e.g., Drive 1000 sign-ups"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Start Date</Label>
          <Input
            type="date"
            value={value.startDate}
            onChange={(e) => update('startDate', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">End Date</Label>
          <Input
            type="date"
            value={value.endDate}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>
      </div>

      <MultiSelectField
        label="Channels"
        options={CHANNEL_OPTIONS}
        value={value.channels}
        onChange={(v) => update('channels', v)}
      />

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Target Audience</Label>
          <Input
            value={value.targetAudience}
            onChange={(e) => update('targetAudience', e.target.value)}
            placeholder="Who is this campaign targeting?"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Budget</Label>
          <Input
            value={value.budget}
            onChange={(e) => update('budget', e.target.value)}
            placeholder="e.g., $10,000"
          />
        </div>
      </div>

      <RepeaterField
        label="Key Messages"
        value={value.keyMessages}
        onChange={(v) => update('keyMessages', v)}
        placeholder="Add a key message…"
      />

      <RepeaterField
        label="Deliverables"
        value={value.deliverables}
        onChange={(v) => update('deliverables', v)}
        placeholder="Add a deliverable…"
      />

      <RepeaterField
        label="Success Metrics"
        value={value.successMetrics}
        onChange={(v) => update('successMetrics', v)}
        placeholder="Add a metric…"
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Overall Rating</Label>
        <RadioGroup
          value={value.overallRating}
          onValueChange={(v) => update('overallRating', v as CampaignData['overallRating'])}
          className="flex flex-wrap gap-3"
        >
          {RATING_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`rating-${opt.value}`} />
              <Label htmlFor={`rating-${opt.value}`} className="text-xs font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  )
}
