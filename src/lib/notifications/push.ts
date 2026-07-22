import { supabaseAdmin } from '@/lib/supabase/admin'
import { trackEvent } from './analytics'

let webPushModule: typeof import('web-push') | null = null
let _initialized = false

function ensureInitialized() {
  if (_initialized) return
  // Lazy-load web-push to avoid import errors if not installed
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    webPushModule = require('web-push')
    webPushModule!.setVapidDetails(
      `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'support@agencybeats.app'}`,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    )
    _initialized = true
  } catch {
    console.warn('[push] web-push not available')
  }
}

interface PushPayload {
  title: string
  body: string
  url?: string | null
  notificationId: string
  tag?: string
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<void> {
  ensureInitialized()

  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return

  try {
    if (!webPushModule) return
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (!subs?.length) return

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url,
      notificationId: payload.notificationId,
      tag: payload.tag ?? 'default',
    })

    for (const sub of subs) {
      try {
        await webPushModule.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          pushPayload
        )
        await trackEvent(payload.notificationId, 'push', 'delivered')
      } catch (err: unknown) {
        const pushErr = err as { statusCode?: number; message?: string }
        if (pushErr?.statusCode === 410 || pushErr?.statusCode === 404) {
          // Subscription expired or invalid — clean up
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', sub.endpoint)
        }
        await trackEvent(payload.notificationId, 'push', 'failed', {
          error: pushErr?.message,
          statusCode: pushErr?.statusCode,
        })
      }
    }
  } catch (error) {
    console.error('[push] Failed to send:', error)
  }
}
