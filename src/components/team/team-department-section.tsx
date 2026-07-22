'use client'

import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ChevronDown, Users, Plus } from 'lucide-react'
import { TeamMemberCard, type MemberWorkload } from './team-member-card'
import type { Database } from '@/types/database'

type MemberRow = Database['public']['Tables']['organization_members']['Row']
type MemberWithDepartment = MemberRow & {
  department: { id: string; name: string; color: string } | null
}

interface TeamDepartmentSectionProps {
  department: { id: string; name: string; color: string } | null
  members: MemberWithDepartment[]
  workloads: Map<string, MemberWorkload>
  currentUserId: string | undefined
  isAdmin: boolean
  onEditMember: (member: MemberWithDepartment) => void
  onRemoveMember: (memberId: string) => void
  onInviteToDepartment: (departmentId: string | null) => void
}

export function TeamDepartmentSection({
  department,
  members,
  workloads,
  currentUserId,
  isAdmin,
  onEditMember,
  onRemoveMember,
  onInviteToDepartment,
}: TeamDepartmentSectionProps) {
  const deptName = department?.name ?? 'Unassigned'
  const deptColor = department?.color ?? '#6B7280'

  return (
    <Collapsible defaultOpen>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg p-3 hover:bg-muted transition-colors">
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform [[data-state=closed]>&]:rotate-[-90deg]" />
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: deptColor }}
        />
        <span className="font-semibold text-sm">
          {deptName}{' '}
          <span className="text-muted-foreground font-normal">
            ({members.length})
          </span>
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {members.length > 0 ? (
          <div className="space-y-2 pl-4 pt-2">
            {members.map((member) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                workload={workloads.get(member.user_id)}
                isSelf={member.user_id === currentUserId}
                isAdmin={isAdmin}
                onEdit={onEditMember}
                onRemove={onRemoveMember}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-lg border border-dashed p-6 ml-4 mt-2">
            <div className="text-center">
              <Users className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                No members in this department
              </p>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => onInviteToDepartment(department?.id ?? null)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Invite to {deptName}
                </Button>
              )}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
