import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']

export interface TimelineTask extends TaskRow {
  projects: {
    name: string
    brand_id: string
    brands: { id: string; name: string; logo_url: string | null }
  }
  assignee: {
    user_id: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export interface TimelineMilestone {
  id: string
  project_id: string
  milestone_name: string | null
  milestone_date: string
}

export type ViewMode = 'Day' | 'Week' | 'Month' | 'Quarter'

export interface GanttFilters {
  brandIds: string[]
  projectIds: string[]
  assigneeIds: string[]
  statuses: string[]
  priorities: number[]
}

export const DEFAULT_FILTERS: GanttFilters = {
  brandIds: [],
  projectIds: [],
  assigneeIds: [],
  statuses: [],
  priorities: [],
}

export interface TaskPosition {
  x: number
  y: number
  width: number
  height: number
}

export const PRIORITY_CONFIG: Record<number, { label: string; color: string; dotColor: string }> = {
  0: { label: 'None', color: 'text-slate-400', dotColor: '#94a3b8' },
  1: { label: 'Low', color: 'text-blue-600', dotColor: '#3b82f6' },
  2: { label: 'Medium', color: 'text-amber-600', dotColor: '#f59e0b' },
  3: { label: 'High', color: 'text-orange-600', dotColor: '#f97316' },
  4: { label: 'Urgent', color: 'text-red-600', dotColor: '#ef4444' },
}
