import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { NotificationType, NotificationActionType } from '@/types/enums'
import {
  taskAssignedEmail,
  commentAddedEmail,
  contentScheduledEmail,
  contentPublishedEmail,
  chatMentionEmail,
  dmReceivedEmail,
  threadReplyEmail,
} from '@/lib/email/templates'
import { checkQuietHours, queueForLater } from './quiet-hours'
import { dispatchToChannels } from './channels'

type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
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
  groupKey?: string
  actionType?: NotificationActionType
  actionPayload?: Record<string, unknown>
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  // Don't notify yourself
  if (params.actorId === params.recipientUserId) return

  try {
    // Check user preferences for all channels
    const { data: prefs } = await params.supabase
      .from('notification_preferences')
      .select('in_app, email, push, slack, webhook, digest_frequency')
      .eq('organization_id', params.orgId)
      .eq('user_id', params.recipientUserId)
      .eq('event_type', params.type)
      .maybeSingle<Pick<PrefRow, 'in_app' | 'email' | 'push' | 'slack' | 'webhook' | 'digest_frequency'>>()

    // Default: all channels enabled if no preference row
    const channels = {
      in_app: prefs?.in_app ?? true,
      email: prefs?.email ?? true,
      push: prefs?.push ?? true,
      slack: prefs?.slack ?? true,
      webhook: prefs?.webhook ?? true,
    }

    // If digest mode is active, skip immediate email (digest cron handles it)
    const digestFreq = prefs?.digest_frequency ?? 'none'
    if (digestFreq !== 'none') {
      channels.email = false
    }

    // Always insert the notification row (for in-app display + archival)
    const notification: NotificationInsert = {
      organization_id: params.orgId,
      user_id: params.recipientUserId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
      metadata: (params.metadata ?? {}) as NotificationInsert['metadata'],
      group_key: params.groupKey ?? null,
      action_type: params.actionType ?? null,
      action_payload: params.actionPayload
        ? (params.actionPayload as NotificationInsert['action_payload'])
        : null,
    }

    const { data: inserted, error: insertError } = await params.supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()

    if (insertError || !inserted) {
      console.error('[notification] Failed to insert:', insertError)
      return
    }

    // Check quiet hours — if active, queue non-in-app channels
    const quietResult = await checkQuietHours(params.orgId, params.recipientUserId)
    if (quietResult.isQuietTime) {
      const deferredChannels = Object.entries(channels)
        .filter(([ch, enabled]) => enabled && ch !== 'in_app')
        .map(([ch]) => ch)

      if (deferredChannels.length > 0) {
        await queueForLater(
          params.orgId,
          params.recipientUserId,
          inserted.id,
          deferredChannels,
          quietResult.deliverAfter
        )
      }
      return
    }

    // Build email template if email channel is enabled
    let emailHtml: string | undefined
    let emailSubject: string | undefined

    if (channels.email) {
      const template = buildEmailTemplate(params)
      if (template) {
        emailHtml = template.html
        emailSubject = template.subject
      }
    }

    // Dispatch to all enabled channels (fire-and-forget)
    dispatchToChannels({
      notification: inserted,
      channels,
      orgId: params.orgId,
      emailHtml,
      emailSubject,
    })
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

function buildEmailTemplate(
  params: CreateNotificationParams
): { subject: string; html: string } | null {
  const meta = (params.metadata ?? {}) as Record<string, string>

  switch (params.type) {
    case 'task_assigned':
      return taskAssignedEmail({
        taskTitle: meta.taskTitle ?? 'Untitled Task',
        projectName: meta.projectName ?? '',
        assignedByName: meta.actorName ?? 'Someone',
        taskUrl: params.link ?? '/',
      })
    case 'comment_added':
      return commentAddedEmail({
        taskTitle: meta.taskTitle ?? 'Untitled Task',
        commenterName: meta.actorName ?? 'Someone',
        commentPreview: params.body ?? '',
        taskUrl: params.link ?? '/',
      })
    case 'content_scheduled':
      return contentScheduledEmail({
        taskTitle: meta.taskTitle ?? 'Untitled Task',
        platform: meta.platform ?? '',
        scheduledAt: meta.scheduledAt ?? '',
        taskUrl: params.link ?? '/',
      })
    case 'content_published':
      return contentPublishedEmail({
        taskTitle: meta.taskTitle ?? 'Untitled Task',
        platform: meta.platform ?? '',
        taskUrl: params.link ?? '/',
      })
    case 'chat_mention':
      return chatMentionEmail({
        mentionedByName: meta.senderName ?? 'Someone',
        channelName: meta.channelName ?? 'a channel',
        messagePreview: params.body ?? '',
        chatUrl: params.link ?? '/',
      })
    case 'dm_received':
      return dmReceivedEmail({
        senderName: meta.senderName ?? 'Someone',
        messagePreview: params.body ?? '',
        chatUrl: params.link ?? '/',
      })
    case 'thread_reply':
      return threadReplyEmail({
        replierName: meta.senderName ?? 'Someone',
        messagePreview: params.body ?? '',
        chatUrl: params.link ?? '/',
      })
    default:
      // Generic fallback email
      return {
        subject: params.title,
        html: `<p>${params.body ?? params.title}</p>`,
      }
  }
}
