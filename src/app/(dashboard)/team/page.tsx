'use client'

import { useState, useMemo } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Plus,
  Mail,
  Shield,
  Settings,
  Pencil,
  Trash2,
  Building2,
  Users,
  Search,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { ROLE_LABELS, DEPARTMENT_COLORS } from '@/lib/constants'
import { toast } from 'sonner'
import type { UserRole } from '@/types/enums'
import { TeamStatsBar } from '@/components/team/team-stats-bar'
import { TeamDepartmentSection } from '@/components/team/team-department-section'
import type { MemberWorkload } from '@/components/team/team-member-card'
import type { Database } from '@/types/database'

type MemberRow = Database['public']['Tables']['organization_members']['Row']
type MemberWithDepartment = MemberRow & {
  department: { id: string; name: string; color: string } | null
}

type InvitableRole = 'admin' | 'manager' | 'creator' | 'developer' | 'viewer'
const INVITABLE_ROLES: InvitableRole[] = ['admin', 'manager', 'creator', 'developer', 'viewer']

export default function TeamPage() {
  const { user, role: currentRole } = useCurrentUser()
  const utils = trpc.useUtils()
  const isAdmin = currentRole === 'admin'

  // Search & filter
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState<string>('all')

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InvitableRole>('creator')
  const [inviteDeptId, setInviteDeptId] = useState<string>('none')
  const [inviteJobTitle, setInviteJobTitle] = useState('')

  // Manage departments dialog
  const [manageDeptOpen, setManageDeptOpen] = useState(false)
  const [newDeptName, setNewDeptName] = useState('')
  const [newDeptColor, setNewDeptColor] = useState('#3B82F6')
  const [newDeptDesc, setNewDeptDesc] = useState('')
  const [editDeptId, setEditDeptId] = useState<string | null>(null)
  const [editDeptName, setEditDeptName] = useState('')
  const [editDeptColor, setEditDeptColor] = useState('')
  const [editDeptDesc, setEditDeptDesc] = useState('')

  // Edit member dialog
  const [editMemberOpen, setEditMemberOpen] = useState<string | null>(null)
  const [editMemberName, setEditMemberName] = useState('')
  const [selectedRole, setSelectedRole] = useState<InvitableRole>('creator')
  const [selectedDeptId, setSelectedDeptId] = useState<string>('none')
  const [selectedJobTitle, setSelectedJobTitle] = useState('')

  // Cancel-invitation confirmation
  const [cancelInviteFor, setCancelInviteFor] = useState<{ id: string; email: string } | null>(null)

  // Queries — 3 parallel
  const { data: members, isLoading: membersLoading } = trpc.member.list.useQuery()
  const { data: departments, isLoading: deptsLoading } = trpc.department.list.useQuery()
  const { data: workloadsRaw } = trpc.member.getWorkloads.useQuery()
  const { data: invitations } = trpc.member.listInvitations.useQuery(undefined, {
    enabled: isAdmin,
  })
  const isLoading = membersLoading || deptsLoading

  // Workload map: userId → MemberWorkload
  const workloadMap = useMemo(() => {
    const map = new Map<string, MemberWorkload>()
    if (workloadsRaw) {
      for (const w of workloadsRaw) {
        map.set(w.userId, {
          activeTasks: w.activeTasks,
          projectCount: w.projectCount,
          overdueTasks: w.overdueTasks,
        })
      }
    }
    return map
  }, [workloadsRaw])

  // Stats
  const stats = useMemo(() => {
    const totalMembers = members?.length ?? 0
    const departmentCount = departments?.length ?? 0
    let totalActiveTasks = 0
    workloadMap.forEach((w) => { totalActiveTasks += w.activeTasks })
    return { totalMembers, departmentCount, totalActiveTasks }
  }, [members, departments, workloadMap])

  // Filtered members (search)
  const filteredMembers = useMemo(() => {
    if (!members) return []
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(
      (m) =>
        m.display_name?.toLowerCase().includes(q) ||
        m.job_title?.toLowerCase().includes(q) ||
        m.skills?.some((s: string) => s.toLowerCase().includes(q))
    )
  }, [members, search])

  // Grouped by department
  const groupedMembers = useMemo(() => {
    if (!departments) return []

    const groups: Array<{
      department: { id: string; name: string; color: string } | null
      members: MemberWithDepartment[]
    }> = []

    for (const dept of departments) {
      const deptMembers = filteredMembers.filter(
        (m) => m.department?.id === dept.id
      )
      if (deptFilter === 'all' || deptFilter === dept.id) {
        groups.push({ department: dept, members: deptMembers })
      }
    }

    // Unassigned group
    const unassigned = filteredMembers.filter((m) => !m.department)
    if (deptFilter === 'all' || deptFilter === 'unassigned') {
      groups.push({ department: null, members: unassigned })
    }

    return groups
  }, [filteredMembers, departments, deptFilter])

  // Mutations
  const inviteMutation = trpc.member.invite.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent')
      utils.member.listInvitations.invalidate()
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('creator')
      setInviteDeptId('none')
      setInviteJobTitle('')
    },
    onError: (err) => toast.error(err.message),
  })
  const cancelInvitationMutation = trpc.member.cancelInvitation.useMutation({
    onSuccess: () => {
      toast.success('Invitation cancelled')
      utils.member.listInvitations.invalidate()
      setCancelInviteFor(null)
    },
    onError: (err) => {
      toast.error(err.message)
      // Refresh either way — a NOT_FOUND means the list is already stale.
      utils.member.listInvitations.invalidate()
      setCancelInviteFor(null)
    },
  })
  const updateMemberMutation = trpc.member.updateMember.useMutation({
    onSuccess: () => {
      toast.success('Member updated')
      utils.member.list.invalidate()
      setEditMemberOpen(null)
    },
    onError: (err) => toast.error(err.message),
  })
  const removeMutation = trpc.member.remove.useMutation({
    onSuccess: () => {
      toast.success('Member removed')
      utils.member.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })
  const createDeptMutation = trpc.department.create.useMutation({
    onSuccess: () => {
      toast.success('Department created')
      utils.department.list.invalidate()
      setNewDeptName('')
      setNewDeptColor('#3B82F6')
      setNewDeptDesc('')
    },
    onError: (err) => toast.error(err.message),
  })
  const updateDeptMutation = trpc.department.update.useMutation({
    onSuccess: () => {
      toast.success('Department updated')
      utils.department.list.invalidate()
      setEditDeptId(null)
    },
    onError: (err) => toast.error(err.message),
  })
  const deleteDeptMutation = trpc.department.delete.useMutation({
    onSuccess: () => {
      toast.success('Department deleted')
      utils.department.list.invalidate()
      utils.member.list.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    inviteMutation.mutate({
      email: inviteEmail,
      role: inviteRole,
      departmentId: inviteDeptId !== 'none' ? inviteDeptId : undefined,
      jobTitle: inviteJobTitle || undefined,
    })
  }

  function handleCreateDept(e: React.FormEvent) {
    e.preventDefault()
    if (!newDeptName.trim()) return
    createDeptMutation.mutate({
      name: newDeptName.trim(),
      color: newDeptColor,
      description: newDeptDesc || undefined,
    })
  }

  function handleSaveEditDept() {
    if (!editDeptId || !editDeptName.trim()) return
    updateDeptMutation.mutate({
      id: editDeptId,
      name: editDeptName.trim(),
      color: editDeptColor,
      description: editDeptDesc || undefined,
    })
  }

  function openEditMember(member: MemberWithDepartment) {
    setEditMemberOpen(member.id)
    setEditMemberName(member.display_name ?? 'Member')
    setSelectedRole(member.role as InvitableRole)
    setSelectedDeptId(member.department?.id ?? 'none')
    setSelectedJobTitle(member.job_title ?? '')
  }

  function handleSaveMember() {
    if (!editMemberOpen) return
    updateMemberMutation.mutate({
      memberId: editMemberOpen,
      role: selectedRole,
      departmentId: selectedDeptId !== 'none' ? selectedDeptId : null,
      jobTitle: selectedJobTitle || null,
    })
  }

  function handleRemoveMember(memberId: string) {
    removeMutation.mutate({ memberId })
  }

  function handleInviteToDepartment(departmentId: string | null) {
    setInviteDeptId(departmentId ?? 'none')
    setInviteOpen(true)
  }

  return (
    <>
      <TopBar title="Team & Workload" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Team & Workload</h2>
            </div>
            <p className="text-muted-foreground mt-1">
              Manage team members, monitor workloads, and organize departments
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <Button variant="outline" onClick={() => setManageDeptOpen(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Departments
              </Button>
            )}
            {isAdmin && (
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleInvite}>
                    <DialogHeader>
                      <DialogTitle>Invite Team Member</DialogTitle>
                      <DialogDescription>
                        Send an invitation email to add a new member to your organization.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="invite-email">Email address</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="colleague@company.com"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as InvitableRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {INVITABLE_ROLES.map((r) => (
                              <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Department (optional)</Label>
                        <Select value={inviteDeptId} onValueChange={setInviteDeptId}>
                          <SelectTrigger>
                            <SelectValue placeholder="No department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No department</SelectItem>
                            {departments?.map((dept) => (
                              <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Job Title (optional)</Label>
                        <Input
                          placeholder="e.g. Senior Developer"
                          value={inviteJobTitle}
                          onChange={(e) => setInviteJobTitle(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={inviteMutation.isPending}>
                        {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <TeamStatsBar
          totalMembers={stats.totalMembers}
          departmentCount={stats.departmentCount}
          totalActiveTasks={stats.totalActiveTasks}
        />

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members by name, title, or skill..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    {dept.name}
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pending invitations */}
        {isAdmin && invitations && invitations.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">
                  Pending invitations ({invitations.length})
                </h3>
              </div>
              <div className="divide-y">
                {invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{invitation.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {ROLE_LABELS[invitation.role as UserRole] ?? invitation.role}
                        {' · '}
                        {invitation.isExpired
                          ? 'Expired'
                          : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setCancelInviteFor({ id: invitation.id, email: invitation.email })
                      }
                    >
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="mt-1.5 h-3 w-48 rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 rounded bg-muted" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : members && members.length > 0 ? (
          <div className="space-y-4">
            {groupedMembers.map((group) => (
              <TeamDepartmentSection
                key={group.department?.id ?? 'unassigned'}
                department={group.department}
                members={group.members}
                workloads={workloadMap}
                currentUserId={user?.id}
                isAdmin={isAdmin}
                onEditMember={openEditMember}
                onRemoveMember={handleRemoveMember}
                onInviteToDepartment={handleInviteToDepartment}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-medium">No team members yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite team members to start collaborating
              </p>
              {isAdmin && (
                <Button className="mt-4" onClick={() => setInviteOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Cancel Invitation Dialog */}
      <Dialog
        open={cancelInviteFor !== null}
        onOpenChange={(open) => { if (!open) setCancelInviteFor(null) }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cancel invitation?</DialogTitle>
            <DialogDescription>
              The invitation link sent to {cancelInviteFor?.email} will stop
              working immediately. You can always send a new one.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelInviteFor(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              disabled={cancelInvitationMutation.isPending}
              onClick={() => {
                if (cancelInviteFor) {
                  cancelInvitationMutation.mutate({ invitationId: cancelInviteFor.id })
                }
              }}
            >
              {cancelInvitationMutation.isPending ? 'Cancelling...' : 'Cancel invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog
        open={editMemberOpen !== null}
        onOpenChange={(open) => { if (!open) setEditMemberOpen(null) }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update role, department, and job title for {editMemberName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as InvitableRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVITABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      <span className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5" />
                        {ROLE_LABELS[r]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: dept.color }}
                        />
                        {dept.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Job Title</Label>
              <Input
                placeholder="e.g. Senior Developer"
                value={selectedJobTitle}
                onChange={(e) => setSelectedJobTitle(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMemberOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMember}
              disabled={updateMemberMutation.isPending}
            >
              {updateMemberMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Departments Dialog */}
      <Dialog open={manageDeptOpen} onOpenChange={setManageDeptOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Manage Departments
            </DialogTitle>
            <DialogDescription>
              Add, rename, or remove departments. Deleting a department moves its members to Unassigned.
            </DialogDescription>
          </DialogHeader>

          {/* Existing departments */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {departments && departments.length > 0 ? (
              departments.map((dept) => (
                <div key={dept.id} className="rounded-lg border">
                  <div className="flex items-center gap-2 p-3">
                    <span
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{ backgroundColor: dept.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-sm">{dept.name}</span>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {dept.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        if (editDeptId === dept.id) {
                          setEditDeptId(null)
                        } else {
                          setEditDeptId(dept.id)
                          setEditDeptName(dept.name)
                          setEditDeptColor(dept.color)
                          setEditDeptDesc(dept.description ?? '')
                        }
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm(`Delete "${dept.name}"? Members will become unassigned.`)) {
                          deleteDeptMutation.mutate({ id: dept.id })
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {editDeptId === dept.id && (
                    <div className="border-t bg-muted/30 p-3 space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={editDeptName}
                          onChange={(e) => setEditDeptName(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Description</Label>
                        <Input
                          placeholder="What does this department do?"
                          value={editDeptDesc}
                          onChange={(e) => setEditDeptDesc(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Color</Label>
                        <div className="flex gap-1.5 flex-wrap">
                          {Object.values(DEPARTMENT_COLORS).map((hex) => (
                            <button
                              key={hex}
                              type="button"
                              className={`h-6 w-6 rounded-full border-2 transition-colors ${
                                editDeptColor === hex ? 'border-foreground scale-110' : 'border-transparent'
                              }`}
                              style={{ backgroundColor: hex }}
                              onClick={() => setEditDeptColor(hex)}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={handleSaveEditDept} disabled={updateDeptMutation.isPending}>
                          {updateDeptMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditDeptId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No departments yet. Add one below.
              </p>
            )}
          </div>

          <Separator />

          {/* Add new department */}
          <form onSubmit={handleCreateDept} className="space-y-3">
            <h4 className="text-sm font-medium">Add Department</h4>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Department name"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                required
              />
              <Button
                type="submit"
                size="sm"
                disabled={createDeptMutation.isPending || !newDeptName.trim()}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground shrink-0">Color:</Label>
              <div className="flex gap-1 flex-wrap">
                {Object.values(DEPARTMENT_COLORS).map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    className={`h-5 w-5 rounded-full border-2 transition-colors ${
                      newDeptColor === hex ? 'border-foreground' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                    onClick={() => setNewDeptColor(hex)}
                  />
                ))}
              </div>
            </div>
            <Input
              placeholder="Description (optional)"
              value={newDeptDesc}
              onChange={(e) => setNewDeptDesc(e.target.value)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
