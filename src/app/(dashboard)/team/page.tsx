'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Mail, Shield, UserMinus } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { ROLE_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import type { UserRole } from '@/types/enums'

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-purple-100 text-purple-700',
  creator: 'bg-blue-100 text-blue-700',
  developer: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
  client: 'bg-orange-100 text-orange-700',
}

type InvitableRole = 'admin' | 'manager' | 'creator' | 'developer' | 'viewer'
const INVITABLE_ROLES: InvitableRole[] = ['admin', 'manager', 'creator', 'developer', 'viewer']

export default function TeamPage() {
  const { user, role: currentRole } = useCurrentUser()
  const utils = trpc.useUtils()
  const isAdmin = currentRole === 'admin'

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<InvitableRole>('creator')

  const { data: members, isLoading } = trpc.member.list.useQuery()
  const inviteMutation = trpc.member.invite.useMutation({
    onSuccess: () => {
      toast.success('Invitation sent')
      setInviteOpen(false)
      setInviteEmail('')
      setInviteRole('creator')
    },
    onError: (err) => toast.error(err.message),
  })
  const updateRoleMutation = trpc.member.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Role updated')
      utils.member.list.invalidate()
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

  function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole })
  }

  return (
    <>
      <TopBar title="Team" />
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Team</h2>
            <p className="text-muted-foreground">
              Manage team members and roles
            </p>
          </div>
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
          <div className="space-y-3">
            {members.map((member) => {
              const isSelf = member.user_id === user?.id
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {member.display_name?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.display_name}</p>
                        {isSelf && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Member since {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`text-xs ${ROLE_COLORS[member.role] ?? ''}`}>
                      {ROLE_LABELS[member.role as UserRole] ?? member.role}
                    </Badge>
                    {isAdmin && !isSelf && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {INVITABLE_ROLES.filter((r) => r !== member.role).map((r) => (
                            <DropdownMenuItem
                              key={r}
                              onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: r })}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Change to {ROLE_LABELS[r]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (confirm('Remove this member from the organization?')) {
                                removeMutation.mutate({ memberId: member.id })
                              }
                            }}
                          >
                            <UserMinus className="mr-2 h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
            <div className="text-center">
              <Mail className="mx-auto h-10 w-10 text-muted-foreground" />
              <h3 className="mt-3 text-lg font-medium">No team members yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Invite team members to start collaborating
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
