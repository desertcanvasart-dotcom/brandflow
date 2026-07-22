import type { Database } from '@/types/database'

type TaskRow = Database['public']['Tables']['tasks']['Row']
type ContentItemRow = Database['public']['Tables']['content_items']['Row']
type MeetingRow = Database['public']['Tables']['meetings']['Row']

export type CalendarEventType = 'task' | 'content' | 'meeting' | 'calendar_event'

export type CalendarEvent = {
  id: string
  type: CalendarEventType
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  endTime?: string // HH:MM (meetings)
  status?: string
  platform?: string
  meetingType?: string
  brandName?: string
  projectName?: string
  brandId?: string
  projectId?: string
  // Original data for mutations
  originalTask?: TaskRow & {
    projects: {
      organization_id: string
      brand_id: string
      name: string
      brands: { name: string; logo_url: string | null }
    }
  }
  originalContent?: ContentItemRow & {
    tasks: TaskRow & {
      projects: {
        organization_id: string
        brand_id: string
        brands: { name: string; logo_url: string | null }
      }
    }
  }
  originalMeeting?: MeetingRow
}
