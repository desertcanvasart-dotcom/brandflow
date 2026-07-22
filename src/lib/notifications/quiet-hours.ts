import { supabaseAdmin } from '@/lib/supabase/admin'

interface QuietHoursResult {
  isQuietTime: boolean
  deliverAfter: Date
}

export async function checkQuietHours(
  orgId: string,
  userId: string
): Promise<QuietHoursResult> {
  try {
    const { data: qh } = await supabaseAdmin
      .from('notification_quiet_hours')
      .select('*')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .maybeSingle()

    if (!qh?.is_enabled) {
      return { isQuietTime: false, deliverAfter: new Date() }
    }

    // Get current time in user's timezone
    const now = new Date()
    const userTime = new Date(
      now.toLocaleString('en-US', { timeZone: qh.timezone })
    )
    const currentMinutes = userTime.getHours() * 60 + userTime.getMinutes()

    // Parse start/end times (HH:MM format)
    const [startH, startM] = qh.start_time.split(':').map(Number)
    const [endH, endM] = qh.end_time.split(':').map(Number)
    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    let isQuietTime: boolean
    if (startMinutes <= endMinutes) {
      // Same day range (e.g., 08:00 - 18:00)
      isQuietTime = currentMinutes >= startMinutes && currentMinutes < endMinutes
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      isQuietTime = currentMinutes >= startMinutes || currentMinutes < endMinutes
    }

    if (!isQuietTime) {
      return { isQuietTime: false, deliverAfter: new Date() }
    }

    // Calculate when quiet hours end (deliverAfter) in UTC
    const endDate = new Date(userTime)
    if (startMinutes > endMinutes && currentMinutes >= startMinutes) {
      // It's after start time, quiet hours end tomorrow
      endDate.setDate(endDate.getDate() + 1)
    }
    endDate.setHours(endH, endM, 0, 0)

    // Convert back to UTC by applying timezone offset
    const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }))
    const offsetMs = userTime.getTime() - utcNow.getTime()
    const deliverAfter = new Date(endDate.getTime() - offsetMs)

    return { isQuietTime: true, deliverAfter }
  } catch (error) {
    console.error('[quiet-hours] Check failed:', error)
    return { isQuietTime: false, deliverAfter: new Date() }
  }
}

export async function queueForLater(
  orgId: string,
  userId: string,
  notificationId: string,
  channels: string[],
  deliverAfter: Date
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_queue').insert({
      organization_id: orgId,
      user_id: userId,
      notification_id: notificationId,
      channels,
      deliver_after: deliverAfter.toISOString(),
    })
  } catch (error) {
    console.error('[quiet-hours] Failed to queue notification:', error)
  }
}
