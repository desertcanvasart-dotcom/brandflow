import type { NotificationType } from '@/types/enums'
import type { Database } from '@/types/database'
import { sendPushNotification } from './push'
import { sendSlackNotification } from './slack'
import { sendWebhookNotification } from './webhook'
import { trackEvent } from './analytics'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

interface ChannelConfig {
  in_app: boolean
  email: boolean
  push: boolean
  slack: boolean
  webhook: boolean
}

interface DeliveryParams {
  notification: NotificationRow
  channels: ChannelConfig
  orgId: string
  emailHtml?: string
  emailSubject?: string
}

export async function dispatchToChannels(params: DeliveryParams): Promise<void> {
  const { notification, channels, orgId } = params
  const deliveries: Promise<void>[] = []

  // In-app is already inserted as the notification row
  if (channels.in_app) {
    trackEvent(notification.id, 'in_app', 'delivered').catch(console.error)
  }

  // Email
  if (channels.email && params.emailHtml) {
    const { sendEmail } = await import('@/lib/email/send')
    deliveries.push(
      (async () => {
        try {
          const { supabaseAdmin } = await import('@/lib/supabase/admin')
          const { data } = await supabaseAdmin.auth.admin.getUserById(notification.user_id)
          const email = data?.user?.email
          if (!email) return

          await sendEmail({
            to: email,
            subject: params.emailSubject ?? notification.title,
            html: params.emailHtml!,
          })
          await trackEvent(notification.id, 'email', 'delivered')
        } catch (error) {
          console.error('[channels] Email failed:', error)
          await trackEvent(notification.id, 'email', 'failed').catch(() => {})
        }
      })()
    )
  }

  // Push
  if (channels.push) {
    deliveries.push(
      sendPushNotification(notification.user_id, {
        title: notification.title,
        body: notification.body ?? '',
        url: notification.link,
        notificationId: notification.id,
        tag: notification.group_key ?? undefined,
      })
    )
  }

  // Slack
  if (channels.slack) {
    deliveries.push(
      sendSlackNotification(orgId, {
        type: notification.type as NotificationType,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        notificationId: notification.id,
      })
    )
  }

  // Webhook
  if (channels.webhook) {
    deliveries.push(
      sendWebhookNotification(orgId, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        metadata: notification.metadata as Record<string, unknown>,
        created_at: notification.created_at,
      })
    )
  }

  // Fire-and-forget
  Promise.allSettled(deliveries).catch(console.error)
}
