'use client'

import { trpc } from '@/trpc/client'
import { cn } from '@/lib/utils'
import type { ProjectHealth } from '@/types/enums'

const HEALTH_CONFIG: Record<
  ProjectHealth,
  { label: string; dot: string; bg: string; text: string }
> = {
  on_track: {
    label: 'On Track',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  at_risk: {
    label: 'At Risk',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-400',
  },
  delayed: {
    label: 'Delayed',
    dot: 'bg-red-500',
    bg: 'bg-red-50 dark:bg-red-950/40',
    text: 'text-red-700 dark:text-red-400',
  },
}

/**
 * Self-contained health badge that fetches its own data.
 */
export function ProjectHealthBadge({ projectId }: { projectId: string }) {
  const { data, isLoading } = trpc.projectTasks.getProjectHealth.useQuery({
    projectId,
  })

  if (isLoading || !data) {
    return (
      <span className="inline-flex h-6 w-16 animate-pulse rounded-full bg-muted" />
    )
  }

  return <ProjectHealthBadgeUI health={data.health as ProjectHealth} />
}

/**
 * Pure UI badge — use when you already have the health value.
 */
export function ProjectHealthBadgeUI({ health }: { health: ProjectHealth }) {
  const config = HEALTH_CONFIG[health]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.bg,
        config.text
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  )
}
