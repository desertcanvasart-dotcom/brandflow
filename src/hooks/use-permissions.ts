'use client'

import { useCurrentUser } from './use-current-user'
import type { UserRole } from '@/types/enums'
import { ROLE_HIERARCHY } from '@/lib/constants'

export function usePermissions() {
  const { role } = useCurrentUser()

  const hasMinRole = (minRole: UserRole): boolean => {
    if (!role) return false
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole]
  }

  const canManageProjects = hasMinRole('manager')
  const canEditContent = hasMinRole('creator')
  const canViewOnly = role === 'viewer' || role === 'client'
  const isAdmin = role === 'admin'
  const isClient = role === 'client'

  return {
    role,
    hasMinRole,
    canManageProjects,
    canEditContent,
    canViewOnly,
    isAdmin,
    isClient,
  }
}
