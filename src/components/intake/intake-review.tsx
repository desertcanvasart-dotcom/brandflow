'use client'

import { useState } from 'react'
import { AlertTriangle, Check, RefreshCw, Sparkles, Pencil, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import type { ServiceType } from '@/types/enums'
import type { Database } from '@/types/database'

type IntakeRow = Database['public']['Tables']['project_intake']['Row']

interface IntakeReviewProps {
  intake: IntakeRow
  projectId: string
  onReextract?: () => void
}

export function IntakeReview({ intake, projectId, onReextract }: IntakeReviewProps) {
  const [editing, setEditing] = useState(false)
  const [editData, setEditData] = useState({
    client_name: intake.client_name ?? '',
    company_name: intake.company_name ?? '',
    industry: intake.industry ?? '',
    budget_range: intake.budget_range ?? '',
    timeline: intake.timeline ?? '',
    goals: (intake.goals as string[]) ?? [],
    pain_points: (intake.pain_points as string[]) ?? [],
  })

  const utils = trpc.useUtils()

  const updateMutation = trpc.intake.updateIntake.useMutation({
    onSuccess: () => {
      utils.intake.getIntake.invalidate({ projectId })
      setEditing(false)
      toast.success('Intake updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const approveMutation = trpc.intake.approveIntake.useMutation({
    onSuccess: () => {
      utils.intake.getIntake.invalidate({ projectId })
      toast.success('Intake approved')
    },
    onError: (err) => toast.error(err.message),
  })

  const handleSave = () => {
    updateMutation.mutate({
      id: intake.id,
      client_name: editData.client_name || null,
      company_name: editData.company_name || null,
      industry: editData.industry || null,
      budget_range: editData.budget_range || null,
      timeline: editData.timeline || null,
      goals: editData.goals,
      pain_points: editData.pain_points,
    })
  }

  const confidence = intake.confidence as 'high' | 'medium' | 'low'
  const services = (intake.services_requested ?? []) as string[]
  const goals = (intake.goals as string[]) ?? []
  const painPoints = (intake.pain_points as string[]) ?? []
  const competitors = (intake.competitors as Array<{ name: string; url?: string; notes?: string }>) ?? []
  const targetAudience = intake.target_audience as { description?: string; demographics?: string[]; locations?: string[] } | null
  const existingAssets = (intake.existing_assets as Array<{ type: string; description: string; url?: string }>) ?? []

  return (
    <div className="space-y-4">
      {/* Confidence Banner */}
      {confidence === 'low' && (
        <div className="flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>AI confidence is low — please review all fields carefully before approving.</span>
        </div>
      )}
      {confidence === 'medium' && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Some fields may need review — AI confidence is moderate.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Intake Summary</h3>
          <Badge
            variant={intake.status === 'approved' ? 'default' : 'secondary'}
          >
            {intake.status}
          </Badge>
          <Badge variant="outline" className={
            confidence === 'high' ? 'text-green-600 border-green-300' :
            confidence === 'medium' ? 'text-amber-600 border-amber-300' :
            'text-yellow-600 border-yellow-300'
          }>
            {confidence} confidence
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                <Check className="h-4 w-4 mr-1" /> Save
              </Button>
            </>
          ) : (
            <>
              {intake.status !== 'approved' && (
                <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit
                </Button>
              )}
              {onReextract && (
                <Button size="sm" variant="outline" onClick={onReextract}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Re-extract
                </Button>
              )}
              {intake.status !== 'approved' && (
                <Button
                  size="sm"
                  onClick={() => approveMutation.mutate({ id: intake.id })}
                  disabled={approveMutation.isPending}
                >
                  <Check className="h-4 w-4 mr-1" /> Approve
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Client Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Client Name</label>
                  <Input
                    value={editData.client_name}
                    onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Company</label>
                  <Input
                    value={editData.company_name}
                    onChange={(e) => setEditData({ ...editData, company_name: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Industry</label>
                  <Input
                    value={editData.industry}
                    onChange={(e) => setEditData({ ...editData, industry: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <div><span className="text-muted-foreground">Client:</span> {intake.client_name || '—'}</div>
                <div><span className="text-muted-foreground">Company:</span> {intake.company_name || '—'}</div>
                <div><span className="text-muted-foreground">Industry:</span> {intake.industry || '—'}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Budget & Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Budget & Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {editing ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground">Budget Range</label>
                  <Input
                    value={editData.budget_range}
                    onChange={(e) => setEditData({ ...editData, budget_range: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Timeline</label>
                  <Input
                    value={editData.timeline}
                    onChange={(e) => setEditData({ ...editData, timeline: e.target.value })}
                    className="h-8 mt-1"
                  />
                </div>
              </>
            ) : (
              <>
                <div><span className="text-muted-foreground">Budget:</span> {intake.budget_range || '—'}</div>
                <div><span className="text-muted-foreground">Timeline:</span> {intake.timeline || '—'}</div>
                <div><span className="text-muted-foreground">Start Date:</span> {intake.start_date ? new Date(intake.start_date).toLocaleDateString() : '—'}</div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Goals</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editData.goals.join('\n')}
                onChange={(e) => setEditData({ ...editData, goals: e.target.value.split('\n').filter(Boolean) })}
                placeholder="One goal per line"
                rows={4}
              />
            ) : goals.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {goals.map((goal, i) => <li key={i}>{goal}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No goals extracted</p>
            )}
          </CardContent>
        </Card>

        {/* Services Requested */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Services Requested</CardTitle>
          </CardHeader>
          <CardContent>
            {services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {services.map((s) => (
                  <Badge key={s} variant="secondary">
                    {SERVICE_TYPE_LABELS[s as ServiceType] ?? s}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No services identified</p>
            )}
          </CardContent>
        </Card>

        {/* Pain Points */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Pain Points</CardTitle>
          </CardHeader>
          <CardContent>
            {editing ? (
              <Textarea
                value={editData.pain_points.join('\n')}
                onChange={(e) => setEditData({ ...editData, pain_points: e.target.value.split('\n').filter(Boolean) })}
                placeholder="One pain point per line"
                rows={4}
              />
            ) : painPoints.length > 0 ? (
              <ul className="list-disc list-inside text-sm space-y-1">
                {painPoints.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No pain points extracted</p>
            )}
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {targetAudience?.description && (
              <p>{targetAudience.description}</p>
            )}
            {targetAudience?.demographics && targetAudience.demographics.length > 0 && (
              <div>
                <span className="text-muted-foreground">Demographics: </span>
                {targetAudience.demographics.join(', ')}
              </div>
            )}
            {targetAudience?.locations && targetAudience.locations.length > 0 && (
              <div>
                <span className="text-muted-foreground">Locations: </span>
                {targetAudience.locations.join(', ')}
              </div>
            )}
            {!targetAudience?.description && (!targetAudience?.demographics || targetAudience.demographics.length === 0) && (
              <p className="text-muted-foreground">No audience data extracted</p>
            )}
          </CardContent>
        </Card>

        {/* Competitors */}
        {competitors.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Competitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {competitors.map((c, i) => (
                  <div key={i}>
                    <span className="font-medium">{c.name}</span>
                    {c.url && <span className="text-muted-foreground ml-1">({c.url})</span>}
                    {c.notes && <p className="text-muted-foreground text-xs">{c.notes}</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing Assets */}
        {existingAssets.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Existing Assets</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {existingAssets.map((a, i) => (
                  <div key={i}>
                    <Badge variant="outline" className="text-[10px] mr-1">{a.type}</Badge>
                    {a.description}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
