'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RepeaterField, MultiSelectField } from '../form-fields'
import { CHANNEL_OPTIONS, type PersonaData } from '@/types/kb-forms'

interface PersonaFormProps {
  value: PersonaData
  onChange: (value: PersonaData) => void
}

export function PersonaForm({ value, onChange }: PersonaFormProps) {
  function update<K extends keyof PersonaData>(field: K, val: PersonaData[K]) {
    onChange({ ...value, [field]: val })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Persona Name</Label>
          <Input
            value={value.personaName}
            onChange={(e) => update('personaName', e.target.value)}
            placeholder="e.g., Tech-Savvy Millennial"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Role / Job Title</Label>
          <Input
            value={value.role}
            onChange={(e) => update('role', e.target.value)}
            placeholder="e.g., Marketing Manager"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Demographics</Label>
        <Textarea
          value={value.demographics}
          onChange={(e) => update('demographics', e.target.value)}
          placeholder="Age range, location, income bracket, education…"
          className="min-h-[60px]"
        />
      </div>

      <RepeaterField
        label="Goals"
        value={value.goals}
        onChange={(v) => update('goals', v)}
        placeholder="Add a goal…"
      />

      <RepeaterField
        label="Pain Points"
        value={value.painPoints}
        onChange={(v) => update('painPoints', v)}
        placeholder="Add a pain point…"
      />

      <MultiSelectField
        label="Preferred Channels"
        options={CHANNEL_OPTIONS}
        value={value.preferredChannels}
        onChange={(v) => update('preferredChannels', v)}
      />

      <div className="space-y-1.5">
        <Label className="text-xs">Behavior Notes</Label>
        <Textarea
          value={value.behaviorNotes}
          onChange={(e) => update('behaviorNotes', e.target.value)}
          placeholder="How they research, buy, and interact with brands…"
          className="min-h-[60px]"
        />
      </div>

      <RepeaterField
        label="Key Quotes"
        value={value.quotes}
        onChange={(v) => update('quotes', v)}
        placeholder="Add a representative quote…"
      />
    </div>
  )
}
