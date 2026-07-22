'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { RepeaterField, StepRepeaterField } from '../form-fields'
import type { SOPData } from '@/types/kb-forms'

interface SOPFormProps {
  value: SOPData
  onChange: (value: SOPData) => void
}

const FREQUENCY_OPTIONS: { value: SOPData['frequency']; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'per_project', label: 'Per Project' },
  { value: 'as_needed', label: 'As Needed' },
]

export function SOPForm({ value, onChange }: SOPFormProps) {
  function update<K extends keyof SOPData>(field: K, val: SOPData[K]) {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Process Name</Label>
          <Input
            value={value.processName}
            onChange={(e) => update('processName', e.target.value)}
            placeholder="e.g., Client Onboarding"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Process Owner</Label>
          <Input
            value={value.owner}
            onChange={(e) => update('owner', e.target.value)}
            placeholder="e.g., Account Manager"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Frequency</Label>
        <RadioGroup
          value={value.frequency}
          onValueChange={(v) => update('frequency', v as SOPData['frequency'])}
          className="flex flex-wrap gap-3"
        >
          {FREQUENCY_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-1.5">
              <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
              <Label htmlFor={`freq-${opt.value}`} className="text-xs font-normal cursor-pointer">
                {opt.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <StepRepeaterField
        label="Process Steps"
        value={value.steps}
        onChange={(v) => update('steps', v)}
      />

      <RepeaterField
        label="Tools Used"
        value={value.tools}
        onChange={(v) => update('tools', v)}
        placeholder="Add a tool…"
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Additional Notes</Label>
        <Textarea
          value={value.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Any important notes about this process…"
          className="min-h-[60px]"
        />
      </div>
    </div>
  )
}
