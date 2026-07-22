import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { trackEvent } from './analytics'

interface WebhookPayload {
  id: string
  type: string
  title: string
  body?: string | null
  link?: string | null
  metadata?: Record<string, unknown>
  created_at: string
}

export async function sendWebhookNotification(
  orgId: string,
  payload: WebhookPayload
): Promise<void> {
  try {
    // Fetch all active webhook integrations for org
    const { data: webhooks } = await supabaseAdmin
      .from('organization_integrations')
      .select('id, config')
      .eq('organization_id', orgId)
      .eq('type', 'webhook')
      .eq('is_active', true)

    if (!webhooks?.length) return

    for (const wh of webhooks) {
      const config = wh.config as {
        url: string
        secret: string
        events?: string[]
      }

      // Check if this event type is subscribed
      if (config.events?.length && !config.events.includes(payload.type)) {
        continue
      }

      const body = JSON.stringify({
        event: payload.type,
        data: payload,
        timestamp: new Date().toISOString(),
      })

      const signature = crypto
        .createHmac('sha256', config.secret)
        .update(body)
        .digest('hex')

      await deliverWithRetry(config.url, body, signature, payload.id)
    }
  } catch (error) {
    console.error('[webhook] Failed to send:', error)
  }
}

async function deliverWithRetry(
  url: string,
  body: string,
  signature: string,
  notificationId: string,
  attempt = 1
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AgencyBeats-Signature': `sha256=${signature}`,
        'X-AgencyBeats-Delivery': notificationId,
        'User-Agent': 'AgencyBeats-Webhook/1.0',
      },
      body,
      signal: AbortSignal.timeout(10_000),
    })

    await trackEvent(
      notificationId,
      'webhook',
      res.ok ? 'delivered' : 'failed',
      { status: res.status, attempt }
    )
  } catch (error) {
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)))
      return deliverWithRetry(url, body, signature, notificationId, attempt + 1)
    }
    await trackEvent(notificationId, 'webhook', 'failed', {
      error: String(error),
      attempt,
    }).catch(() => {})
  }
}
