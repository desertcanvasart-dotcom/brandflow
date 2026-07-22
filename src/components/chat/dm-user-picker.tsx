'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { trpc } from '@/trpc/client'

interface DmUserPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentUserId: string | null
  onSelect: (userId: string) => void
}

export function DmUserPicker({
  open,
  onOpenChange,
  currentUserId,
  onSelect,
}: DmUserPickerProps) {
  const [creating, setCreating] = useState(false)

  const { data: membersData, isLoading } = trpc.member.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  })

  const getOrCreateDM = trpc.chat.getOrCreateDM.useMutation()

  const members = (membersData ?? [])
    .filter((m: any) => m.user_id !== currentUserId)
    .map((m: any) => ({
      userId: m.user_id,
      displayName: m.display_name ?? m.email ?? 'Unknown',
      avatarUrl: m.avatar_url ?? null,
      role: m.role ?? '',
    }))

  const handleSelect = async (userId: string) => {
    setCreating(true)
    try {
      const result = await getOrCreateDM.mutateAsync({ otherUserId: userId })
      onSelect(result.channelId)
      onOpenChange(false)
    } catch (err) {
      console.error('Failed to create DM:', err)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>

        <Command className="border-0">
          <CommandInput placeholder="Search team members..." disabled={creating} />
          <CommandList className="max-h-64">
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <CommandEmpty>No members found.</CommandEmpty>
                <CommandGroup>
                  {members.map((member) => {
                    const initials = member.displayName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <CommandItem
                        key={member.userId}
                        value={member.displayName}
                        onSelect={() => handleSelect(member.userId)}
                        disabled={creating}
                        className="flex items-center gap-3 px-3 py-2"
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          {member.avatarUrl && (
                            <AvatarImage src={member.avatarUrl} alt={member.displayName} />
                          )}
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{member.displayName}</p>
                          {member.role && (
                            <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
                          )}
                        </div>
                        {creating && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
