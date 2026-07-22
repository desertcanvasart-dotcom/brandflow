import { supabaseAdmin } from '@/lib/supabase/admin'

export async function trackEvent(
  notificationId: string,
  channel: string,
  event: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_events').insert({
      notification_id: notificationId,
      channel,
      event,
      metadata: (metadata ?? {}) as Record<string, unknown>,
    })
  } catch (error) {
    console.error('[notification-analytics] Failed to track event:', error)
  }
}
