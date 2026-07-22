import { Badge } from '@/components/ui/badge'
import { TASK_TYPE_COLORS, TASK_TYPE_LABELS } from '@/lib/constants'

interface TaskTypeBadgeProps {
  type: string | null
}

export function TaskTypeBadge({ type }: TaskTypeBadgeProps) {
  if (!type) return null

  const colorClass = TASK_TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'
  const label = TASK_TYPE_LABELS[type] ?? type

  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${colorClass}`}
    >
      {label}
    </span>
  )
}
