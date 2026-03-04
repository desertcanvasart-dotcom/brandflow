import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { NotificationType } from '@/types/enums'
import { sendEmail } from '@/lib/email/send'
import {
  taskAssignedEmail,
  commentAddedEmail,
  contentScheduledEmail,
  contentPublishedEmail,
} from '@/lib/email/templates'

type NotificationRow = Database['public']['Tables']['notifications']['Insert']
type PrefRow = Database['public']['Tables']['notification_preferences']['Row']

interface CreateNotificationParams {
  supabase: SupabaseClient<Database>
  orgId: string
  recipientUserId: string
  actorId: string
  type: NotificationType
  title: string
  body?: string
  link?: string
  metadata?: Record<string, unknown>
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Don't notify yourself
  if (params.actorId === params.recipientUserId) return

  try {
    // Check user preferences
    const { data: prefs } = await params.supabase
      .from('notification_preferences')
      .select('in_app, email')
      .eq('organization_id', params.orgId)
      .eq('user_id', params.recipientUserId)
      .eq('event_type', params.type)
      .maybeSingle<Pick<PrefRow, 'in_app' | 'email'>>()

    // Default to both enabled if no preference row
    const inApp = prefs?.in_app ?? true
    const emailEnabled = prefs?.email ?? true

    // Insert in-app notification
    if (inApp) {
      const notification: NotificationRow = {
        organization_id: params.orgId,
        user_id: params.recipientUserId,
        type: params.type,
        title: params.title,
        body: params.body ?? null,
        link: params.link ?? null,
        metadata: (params.metadata ?? {}) as NotificationRow['metadata'],
      }
      await params.supabase.from('notifications').insert(notification)
    }

    // Send email (fire-and-forget)
    if (emailEnabled) {
      sendEmailForNotification(params).catch(() => {})
    }
  } catch (error) {
    console.error('[notification] Failed to create:', error)
  }
}

export async function createNotifications(
  params: Omit<CreateNotificationParams, 'recipientUserId'> & { recipientUserIds: string[] }
): Promise<void> {
  const unique = [...new Set(params.recipientUserIds)]
  await Promise.allSettled(
    unique.map((userId) =>
      createNotification({ ...params, recipientUserId: userId })
    )
  )
}

async function sendEmailForNotification(params: CreateNotificationParams): Promise<void> {
  try {
    // Use admin client to look up user email
    const { supabaseAdmin } = await import('@/lib/supabase/admin')
    const { data } = await supabaseAdmin.auth.admin.getUserById(params.recipientUserId)
    const email = data?.user?.email
    if (!email) return

    const meta = (params.metadata ?? {}) as Record<string, string>
    let template: { subject: string; html: string } | null = null

    switch (params.type) {
      case 'task_assigned':
        template = taskAssignedEmail({
          taskTitle: meta.taskTitle ?? 'Untitled Task',
          projectName: meta.projectName ?? '',
          assignedByName: meta.actorName ?? 'Someone',
          taskUrl: params.link ?? '/',
        })
        break
      case 'comment_added':
        template = commentAddedEmail({
          taskTitle: meta.taskTitle ?? 'Untitled Task',
          commenterName: meta.actorName ?? 'Someone',
          commentPreview: params.body ?? '',
          taskUrl: params.link ?? '/',
        })
        break
      case 'content_scheduled':
        template = contentScheduledEmail({
          taskTitle: meta.taskTitle ?? 'Untitled Task',
          platform: meta.platform ?? '',
          scheduledAt: meta.scheduledAt ?? '',
          taskUrl: params.link ?? '/',
        })
        break
      case 'content_published':
        template = contentPublishedEmail({
          taskTitle: meta.taskTitle ?? 'Untitled Task',
          platform: meta.platform ?? '',
          taskUrl: params.link ?? '/',
        })
        break
      default:
        // For types without specific templates, use a generic email
        template = {
          subject: params.title,
          html: `<p>${params.body ?? params.title}</p>`,
        }
        break
    }

    if (template) {
      await sendEmail({ to: email, ...template })
    }
  } catch (error) {
    console.error('[notification] Failed to send email:', error)
  }
}
