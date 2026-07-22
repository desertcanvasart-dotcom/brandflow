'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Pencil,
  UserMinus,
  ListChecks,
  FolderKanban,
  AlertTriangle,
} from 'lucide-react'
import { ROLE_LABELS, ROLE_COLORS, getWorkloadLevel } from '@/lib/constants'
import type { UserRole } from '@/types/enums'
import type { Database } from '@/types/database'

type MemberRow = Database['public']['Tables']['organization_members']['Row']
type MemberWithDepartment = MemberRow & {
  department: { id: string; name: string; color: string } | null
}

export interface MemberWorkload {
  activeTasks: number
  projectCount: number
  overdueTasks: number
}

interface TeamMemberCardProps {
  member: MemberWithDepartment
  workload: MemberWorkload | undefined
  isSelf: boolean
  isAdmin: boolean
  onEdit: (member: MemberWithDepartment) => void
  onRemove: (memberId: string) => void
}

export function TeamMemberCard({
  member,
  workload,
  isSelf,
  isAdmin,
  onEdit,
  onRemove,
}: TeamMemberCardProps) {
  const activeTasks = workload?.activeTasks ?? 0
  const projectCount = workload?.projectCount ?? 0
  const overdueTasks = workload?.overdueTasks ?? 0
  const wl = getWorkloadLevel(activeTasks)
  const capacityPercent = Math.min(100, Math.round((activeTasks / 12) * 100))

  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-4">
        {/* Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
          {member.display_name?.charAt(0)?.toUpperCase() ?? '?'}
        </div>

        {/* Name + title + skills */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{member.display_name}</p>
            {isSelf && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                You
              </Badge>
            )}
          </div>
          {member.job_title && (
            <p className="text-sm text-muted-foreground">{member.job_title}</p>
          )}
          {/* Skills */}
          {member.skills && member.skills.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {member.skills.slice(0, 3).map((skill) => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 font-normal"
                >
                  {skill}
                </Badge>
              ))}
              {member.skills.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground font-normal"
                >
                  +{member.skills.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Workload section */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Task & project counts */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ListChecks className="h-3 w-3" />
              {activeTasks} tasks
            </span>
            <span className="flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {projectCount} projects
            </span>
            {overdueTasks > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3 w-3" />
                {overdueTasks} overdue
              </span>
            )}
          </div>

          {/* Workload bar + level */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${wl.barColor}`}
                style={{ width: `${capacityPercent}%` }}
              />
            </div>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${wl.bgColor} ${wl.color}`}
            >
              {wl.label}
            </span>
          </div>
        </div>

        {/* Role badge */}
        <Badge className={`text-xs shrink-0 ${ROLE_COLORS[member.role] ?? ''}`}>
          {ROLE_LABELS[member.role as UserRole] ?? member.role}
        </Badge>

        {/* Admin actions */}
        {isAdmin && !isSelf && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(member)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Member
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (confirm('Remove this member from the organization?')) {
                    onRemove(member.id)
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
}
