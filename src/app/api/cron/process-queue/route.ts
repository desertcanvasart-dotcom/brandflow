import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendPushNotification } from '@/lib/notifications/push'
import { sendSlackNotification } from '@/lib/notifications/slack'
import { sendWebhookNotification } from '@/lib/notifications/webhook'
import { sendEmail } from '@/lib/email/send'
import { trackEvent } from '@/lib/notifications/analytics'
import type { NotificationType } from '@/types/enums'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch unprocessed queue items that are ready for delivery
    const { data: queueItems } = await supabaseAdmin
      .from('notification_queue')
      .select('*, notifications(*)')
      .eq('is_processed', false)
      .lte('deliver_after', new Date().toISOString())
      .limit(100)

    if (!queueItems?.length) {
      return NextResponse.json({ processed: 0 })
    }

    let processed = 0

    for (const item of queueItems) {
      try {
        const notification = (item as unknown as { notifications: NotificationRow | null }).notifications
        if (!notification) continue

        for (const channel of item.channels) {
          switch (channel) {
            case 'email': {
              const { data } = await supabaseAdmin.auth.admin.getUserById(item.user_id)
              const email = data?.user?.email
              if (email) {
                await sendEmail({
                  to: email,
                  subject: notification.title,
                  html: `<p>${notification.body ?? notification.title}</p>`,
                })
                await trackEvent(notification.id, 'email', 'delivered')
              }
              break
            }
            case 'push':
              await sendPushNotification(item.user_id, {
                title: notification.title,
                body: notification.body ?? '',
                url: notification.link,
                notificationId: notification.id,
              })
              break
            case 'slack':
              await sendSlackNotification(item.organization_id, {
                type: notification.type as NotificationType,
                title: notification.title,
                body: notification.body,
                link: notification.link,
                notificationId: notification.id,
              })
              break
            case 'webhook':
              await sendWebhookNotification(item.organization_id, {
                id: notification.id,
                type: notification.type,
                title: notification.title,
                body: notification.body,
                link: notification.link,
                metadata: notification.metadata as Record<string, unknown>,
                created_at: notification.created_at,
              })
              break
          }
        }

        // Mark as processed
        await supabaseAdmin
          .from('notification_queue')
          .update({ is_processed: true, processed_at: new Date().toISOString() })
          .eq('id', item.id)

        processed++
      } catch (error) {
        console.error('[process-queue] Failed to process item:', item.id, error)
      }
    }

    return NextResponse.json({ processed })
  } catch (error) {
    console.error('[process-queue] Cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
