'use client'

import { useState } from 'react'
import { Check, Pencil, X, ChevronDown, ChevronRight, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import type { ServiceType } from '@/types/enums'
import type { Database } from '@/types/database'
import type { Json } from '@/types/database'
import { TaskGenerationResult } from './task-generation-result'

type BriefRow = Database['public']['Tables']['service_briefs']['Row']

interface ServiceBriefFormProps {
  brief: BriefRow
  projectId: string
}

interface Objective {
  objective: string
  priority: string
}

interface Deliverable {
  name: string
  description: string
  estimated_hours: number | null
}

interface Milestone {
  name: string
  target_date: string | null
}

interface Kpi {
  metric: string
  target: string | null
  measurement_method: string | null
}

export function ServiceBriefForm({ brief, projectId }: ServiceBriefFormProps) {
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(brief.title ?? '')
  const [editOverview, setEditOverview] = useState(brief.overview ?? '')
  const [editNotes, setEditNotes] = useState(brief.notes ?? '')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    objectives: true,
    deliverables: true,
    timeline: false,
    requirements: false,
    kpis: false,
  })

  const utils = trpc.useUtils()

  const updateMutation = trpc.intake.updateBrief.useMutation({
    onSuccess: () => {
      utils.intake.listBriefs.invalidate({ projectId })
      setEditing(false)
      toast.success('Brief updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const approveMutation = trpc.intake.approveBrief.useMutation({
    onSuccess: () => {
      utils.intake.listBriefs.invalidate({ projectId })
      toast.success('Brief approved — ready to add tasks', {
        action: {
          label: 'Add Tasks Now',
          onClick: () => {
            window.location.href = `/projects/${projectId}?tab=tasks&setupTasks=true&services=${brief.service_type}`
          },
        },
      })
    },
    onError: (err) => toast.error(err.message),
  })

  const completeMutation = trpc.intake.completeBrief.useMutation({
    onSuccess: () => {
      utils.intake.listBriefs.invalidate({ projectId })
      toast.success('Brief marked as complete')
    },
    onError: (err) => toast.error(err.message),
  })

  const generateTasksMutation = trpc.intake.generateTasksFromBrief.useMutation({
    onSuccess: (result) => {
      utils.intake.listBriefs.invalidate({ projectId })
      utils.intake.getTaskGenerationLog.invalidate({ briefId: brief.id })
      toast.success(`${result.created} tasks created, ${result.excluded} excluded`)
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: brief.id,
      title: editTitle,
      overview: editOverview,
      notes: editNotes || null,
    })
  }

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const objectives = (brief.objectives as unknown as Objective[]) ?? []
  const deliverables = (brief.deliverables as unknown as Deliverable[]) ?? []
  const timelineData = brief.timeline as unknown as { estimated_duration?: string; milestones?: Milestone[] } | null
  const requirements = brief.requirements as unknown as Record<string, Json> | null
  const kpis = (brief.kpis as unknown as Kpi[]) ?? []

  const statusColor = {
    draft: 'secondary' as const,
    in_review: 'outline' as const,
    approved: 'default' as const,
    active: 'default' as const,
    complete: 'default' as const,
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {SERVICE_TYPE_LABELS[brief.service_type as ServiceType] ?? brief.service_type}
            </CardTitle>
            <Badge variant={statusColor[brief.status as keyof typeof statusColor] ?? 'secondary'}>
              {brief.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                  <Check className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </>
            ) : (
              <>
                {brief.status !== 'approved' && brief.status !== 'active' && brief.status !== 'complete' && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ id: brief.id })}
                      disabled={approveMutation.isPending}
                    >
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  </>
                )}
                {brief.status === 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => completeMutation.mutate({ id: brief.id })}
                    disabled={completeMutation.isPending}
                  >
                    {completeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    )}
                    Complete Brief
                  </Button>
                )}
                {brief.status === 'complete' && (
                  <Button
                    size="sm"
                    onClick={() => generateTasksMutation.mutate({ briefId: brief.id, projectId })}
                    disabled={generateTasksMutation.isPending}
                  >
                    {generateTasksMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                    )}
                    Generate Tasks
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Title & Overview */}
        {editing ? (
          <div className="space-y-2">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Brief title"
            />
            <Textarea
              value={editOverview}
              onChange={(e) => setEditOverview(e.target.value)}
              placeholder="Overview"
              rows={3}
            />
          </div>
        ) : (
          <div>
            <h4 className="font-medium">{brief.title}</h4>
            <p className="text-sm text-muted-foreground mt-1">{brief.overview}</p>
          </div>
        )}

        {/* Objectives */}
        <Collapsible open={openSections.objectives} onOpenChange={() => toggleSection('objectives')}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
            {openSections.objectives ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Objectives ({objectives.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {obj.priority}
                  </Badge>
                  {obj.objective}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Deliverables */}
        <Collapsible open={openSections.deliverables} onOpenChange={() => toggleSection('deliverables')}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
            {openSections.deliverables ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Deliverables ({deliverables.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2">
              {deliverables.map((d, i) => (
                <div key={i} className="text-sm border-l-2 border-muted pl-3">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-muted-foreground text-xs">{d.description}</div>
                  {d.estimated_hours && (
                    <div className="text-muted-foreground text-xs">~{d.estimated_hours}h</div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Timeline */}
        <Collapsible open={openSections.timeline} onOpenChange={() => toggleSection('timeline')}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
            {openSections.timeline ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Timeline
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 text-sm">
            {timelineData?.estimated_duration && (
              <p className="mb-2">
                <span className="text-muted-foreground">Duration:</span> {timelineData.estimated_duration}
              </p>
            )}
            {timelineData?.milestones && timelineData.milestones.length > 0 && (
              <div className="space-y-1">
                {timelineData.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                    <span>{m.name}</span>
                    {m.target_date && (
                      <span className="text-xs text-muted-foreground">{m.target_date}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Requirements */}
        <Collapsible open={openSections.requirements} onOpenChange={() => toggleSection('requirements')}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
            {openSections.requirements ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            Requirements
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            {requirements && Object.keys(requirements).length > 0 ? (
              <div className="grid grid-cols-1 gap-1.5 text-sm">
                {Object.entries(requirements).map(([key, value]) => {
                  if (value === null || value === undefined) return null
                  const label = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
                  let displayValue: string
                  if (typeof value === 'boolean') {
                    displayValue = value ? 'Yes' : 'No'
                  } else if (Array.isArray(value)) {
                    if (value.length === 0) return null
                    displayValue = value.join(', ')
                  } else {
                    displayValue = String(value)
                  }
                  return (
                    <div key={key} className="flex gap-2">
                      <span className="text-muted-foreground shrink-0">{label}:</span>
                      <span>{displayValue}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No requirements data</p>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* KPIs */}
        <Collapsible open={openSections.kpis} onOpenChange={() => toggleSection('kpis')}>
          <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium w-full text-left">
            {openSections.kpis ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            KPIs ({kpis.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1.5 text-sm">
              {kpis.map((kpi, i) => (
                <div key={i}>
                  <span className="font-medium">{kpi.metric}</span>
                  {kpi.target && <span className="text-muted-foreground ml-1">— Target: {kpi.target}</span>}
                  {kpi.measurement_method && (
                    <div className="text-xs text-muted-foreground">{kpi.measurement_method}</div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Notes */}
        {editing ? (
          <div>
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              placeholder="Add notes..."
              rows={2}
              className="mt-1"
            />
          </div>
        ) : brief.notes ? (
          <div className="text-sm">
            <span className="font-medium">Notes: </span>
            <span className="text-muted-foreground">{brief.notes}</span>
          </div>
        ) : null}

        {/* Task Generation Result */}
        {(brief.status === 'complete' || generateTasksMutation.isSuccess) && (
          <TaskGenerationResult briefId={brief.id} projectId={projectId} />
        )}
      </CardContent>
    </Card>
  )
}
