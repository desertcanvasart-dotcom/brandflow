'use client'

import { useState } from 'react'
import { Plus, Trash2, Loader2, Zap } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

import { Badge } from '@/components/ui/badge'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import { TASK_TYPE_LABELS } from '@/lib/constants'

const PROJECT_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'content_ops', label: 'Content Operations' },
  { value: 'web_build', label: 'Web Build' },
  { value: 'full_service', label: 'Full Service' },
]

const PLATFORM_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'twitter', label: 'X (Twitter)' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'blog', label: 'Blog' },
  { value: 'newsletter', label: 'Newsletter' },
]

const SERVICE_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  ...Object.entries(SERVICE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

const TASK_TYPE_OPTIONS = [
  { value: '', label: 'Any' },
  ...Object.entries(TASK_TYPE_LABELS).map(([value, label]) => ({ value, label })),
]

export function AutoAssignmentRules() {
  const utils = trpc.useUtils()

  const { data: rules, isLoading } = trpc.automation.listRules.useQuery()
  const { data: members } = trpc.member.list.useQuery()
  const { data: departments } = trpc.department.list.useQuery()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [projectType, setProjectType] = useState('')
  const [platform, setPlatform] = useState('')
  const [taskType, setTaskType] = useState('')
  const [serviceType, setServiceType] = useState('')
  const [actionType, setActionType] = useState<'assign_member' | 'round_robin' | 'assign_department' | 'set_priority'>('assign_member')
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('')
  const [priority, setPriority] = useState(0)

  const toggleMutation = trpc.automation.toggleRule.useMutation({
    onSuccess: () => {
      utils.automation.listRules.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.automation.deleteRule.useMutation({
    onSuccess: () => {
      utils.automation.listRules.invalidate()
      toast.success('Rule deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  const createMutation = trpc.automation.createRule.useMutation({
    onSuccess: () => {
      utils.automation.listRules.invalidate()
      toast.success('Rule created')
      resetForm()
      setDialogOpen(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function resetForm() {
    setName('')
    setProjectType('')
    setPlatform('')
    setTaskType('')
    setServiceType('')
    setActionType('assign_member')
    setSelectedMemberId('')
    setSelectedMemberIds([])
    setSelectedDepartmentId('')
    setPriority(0)
  }

  function handleCreate() {
    if (!name.trim()) {
      toast.error('Please enter a rule name')
      return
    }

    const conditions: Record<string, string> = {}
    if (projectType) conditions.project_type = projectType
    if (platform) conditions.platform = platform
    if (taskType) conditions.task_type = taskType
    if (serviceType) conditions.service_type = serviceType

    const action: {
      type: 'assign_member' | 'round_robin' | 'assign_department' | 'set_priority'
      member_id?: string
      member_ids?: string[]
      department_id?: string
      priority?: number
      due_offset_days?: number
    } = {
      type: actionType as 'assign_member' | 'round_robin' | 'assign_department' | 'set_priority',
    }

    if (actionType === 'assign_member') {
      if (!selectedMemberId) {
        toast.error('Please select a member to assign')
        return
      }
      action.member_id = selectedMemberId
    } else if (actionType === 'round_robin') {
      if (selectedMemberIds.length < 2) {
        toast.error('Please select at least 2 members for round robin')
        return
      }
      action.member_ids = selectedMemberIds
    } else if (actionType === 'assign_department') {
      if (!selectedDepartmentId) {
        toast.error('Please select a department')
        return
      }
      action.department_id = selectedDepartmentId
    }

    createMutation.mutate({
      name: name.trim(),
      ruleType: 'auto_assign',
      conditions,
      action,
      priority,
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this rule?')) return
    deleteMutation.mutate({ id })
  }

  function toggleMember(userId: string) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    )
  }

  function formatConditions(conditions: Record<string, unknown>) {
    const parts: string[] = []
    if (conditions.project_type) {
      const opt = PROJECT_TYPE_OPTIONS.find(
        (o) => o.value === conditions.project_type,
      )
      parts.push(`Project: ${opt?.label ?? conditions.project_type}`)
    }
    if (conditions.platform) {
      const opt = PLATFORM_OPTIONS.find((o) => o.value === conditions.platform)
      parts.push(`Platform: ${opt?.label ?? conditions.platform}`)
    }
    if (conditions.task_type) {
      const label = TASK_TYPE_LABELS[conditions.task_type as string] ?? conditions.task_type
      parts.push(`Type: ${label}`)
    }
    if (conditions.service_type) {
      const label = SERVICE_TYPE_LABELS[conditions.service_type as keyof typeof SERVICE_TYPE_LABELS] ?? conditions.service_type
      parts.push(`Service: ${label}`)
    }
    return parts.length > 0 ? parts.join(', ') : 'All tasks'
  }

  function formatAction(action: Record<string, unknown>) {
    if (action.type === 'round_robin') {
      const ids = (action.member_ids as string[]) ?? []
      return `Round robin (${ids.length} members)`
    }
    if (action.type === 'assign_department') {
      const deptId = action.department_id as string | undefined
      const dept = departments?.find((d: { id: string }) => d.id === deptId)
      return `Assign to ${(dept as { name: string })?.name ?? 'department'}`
    }
    const memberId = action.member_id as string | undefined
    const member = members?.find((m) => m.user_id === memberId)
    return `Assign to ${member?.display_name ?? 'member'}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-muted-foreground" />
              Auto-Assignment Rules
            </CardTitle>
            <CardDescription>
              Automatically assign tasks based on project type and platform.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1" onClick={() => resetForm()}>
                <Plus className="h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Auto-Assignment Rule</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input
                    id="rule-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Instagram posts to Sarah"
                  />
                </div>

                {/* Conditions */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    IF conditions
                  </Label>
                  <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Project Type</Label>
                      <Select value={projectType} onValueChange={setProjectType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || '__any'} value={opt.value || '__any'}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Platform</Label>
                      <Select value={platform} onValueChange={setPlatform}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORM_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || '__any'} value={opt.value || '__any'}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Task Type</Label>
                      <Select value={taskType} onValueChange={setTaskType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || '__any_tt'} value={opt.value || '__any_tt'}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Service Type</Label>
                      <Select value={serviceType} onValueChange={setServiceType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Any" />
                        </SelectTrigger>
                        <SelectContent>
                          {SERVICE_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || '__any_st'} value={opt.value || '__any_st'}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    THEN action
                  </Label>
                  <Select
                    value={actionType}
                    onValueChange={(v) => setActionType(v as typeof actionType)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="assign_member">Assign to member</SelectItem>
                      <SelectItem value="round_robin">Round robin</SelectItem>
                      <SelectItem value="assign_department">Assign to department</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {actionType === 'assign_member' && (
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {members?.map((member) => (
                          <SelectItem key={member.id} value={member.user_id}>
                            {member.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {actionType === 'round_robin' && (
                  <div className="space-y-2">
                    <Label>Round Robin Members</Label>
                    <div className="space-y-2 rounded-md border p-3 max-h-40 overflow-y-auto">
                      {members?.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMemberIds.includes(member.user_id)}
                            onCheckedChange={() => toggleMember(member.user_id)}
                          />
                          <span className="text-sm">{member.display_name}</span>
                        </label>
                      ))}
                      {(!members || members.length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          No members found
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {actionType === 'assign_department' && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={selectedDepartmentId} onValueChange={setSelectedDepartmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments?.map((dept: { id: string; name: string }) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Task will be assigned to the department member with the fewest active tasks
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="rule-priority">Priority</Label>
                  <Input
                    id="rule-priority"
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    'Save Rule'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !rules || rules.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No auto-assignment rules configured yet
          </p>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => {
              const conditions = (rule.conditions ?? {}) as Record<string, unknown>
              const action = (rule.action ?? {}) as Record<string, unknown>

              return (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{rule.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatConditions(conditions)} &rarr; {formatAction(action)}
                    </p>
                  </div>
                  <Switch
                    checked={rule.is_active}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: rule.id, isActive: checked })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
