'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { UserPlus, X } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

interface InviteParticipantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  meetingId: string
  existingParticipantIds: string[]
}

export function InviteParticipantDialog({
  open, onOpenChange, meetingId, existingParticipantIds,
}: InviteParticipantDialogProps) {
  const utils = trpc.useUtils()
  const { data: members } = trpc.member.list.useQuery()
  const [selectedUserId, setSelectedUserId] = useState('')
  const [role, setRole] = useState<'participant' | 'viewer'>('participant')

  // Filter out members already in the meeting
  const availableMembers = members?.filter(
    (m) => !existingParticipantIds.includes(m.user_id)
  ) ?? []

  const addMutation = trpc.meeting.addParticipant.useMutation({
    onSuccess: () => {
      utils.meeting.getById.invalidate({ id: meetingId })
      toast.success('Participant added')
      setSelectedUserId('')
      setRole('participant')
    },
    onError: (err: any) => toast.error(err.message),
  })

  const removeMutation = trpc.meeting.removeParticipant.useMutation({
    onSuccess: () => {
      utils.meeting.getById.invalidate({ id: meetingId })
      toast.success('Participant removed')
    },
    onError: (err: any) => toast.error(err.message),
  })

  function handleAdd() {
    if (!selectedUserId) return
    addMutation.mutate({ meetingId, userId: selectedUserId, role })
  }

  function handleRemove(userId: string) {
    removeMutation.mutate({ meetingId, userId })
  }

  // Get display names for current participants
  const currentParticipants = existingParticipantIds.map((uid) => {
    const member = members?.find((m) => m.user_id === uid)
    return {
      userId: uid,
      displayName: member?.display_name || uid.slice(0, 8) + '...',
      initials: member?.display_name?.charAt(0)?.toUpperCase() ?? '?',
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Manage Participants</DialogTitle>
          <DialogDescription>Add or remove meeting participants from your team.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current participants */}
          {currentParticipants.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Current Participants</Label>
              <div className="space-y-2">
                {currentParticipants.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between rounded-lg border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">{p.initials}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.displayName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(p.userId)}
                      disabled={removeMutation.isPending}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add new participant */}
          {availableMembers.length > 0 ? (
            <div className="space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Add Participant</Label>
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">Team Member</Label>
                  <Select value={selectedUserId || 'pick'} onValueChange={(v) => setSelectedUserId(v === 'pick' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pick" disabled>Select a member</SelectItem>
                      {availableMembers.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>
                          {m.display_name || m.user_id.slice(0, 8)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as 'participant' | 'viewer')}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="participant">Participant</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="button"
                  size="icon"
                  onClick={handleAdd}
                  disabled={!selectedUserId || addMutation.isPending}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              All team members have already been added.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
