import { supabaseAdmin } from '@/lib/supabase/admin'
import type { NotificationActionType } from '@/types/enums'

interface ActionResult {
  success: boolean
  message: string
}

export async function executeNotificationAction(
  notificationId: string,
  userId: string,
  actionType: NotificationActionType
): Promise<ActionResult> {
  // 1. Fetch the notification and verify ownership
  const { data: notification, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('id', notificationId)
    .eq('user_id', userId)
    .single()

  if (error || !notification) {
    return { success: false, message: 'Notification not found' }
  }

  if (notification.action_taken) {
    return { success: false, message: 'Action already taken' }
  }

  const payload = (notification.action_payload ?? {}) as Record<string, string>

  try {
    switch (actionType) {
      case 'approve_task': {
        if (!payload.task_id) return { success: false, message: 'Missing task_id' }
        await supabaseAdmin
          .from('tasks')
          .update({ status: 'approved' })
          .eq('id', payload.task_id)
        break
      }

      case 'reject_task': {
        if (!payload.task_id) return { success: false, message: 'Missing task_id' }
        await supabaseAdmin
          .from('tasks')
          .update({ status: 'in_progress' })
          .eq('id', payload.task_id)
        break
      }

      case 'mark_complete': {
        if (!payload.task_id) return { success: false, message: 'Missing task_id' }
        await supabaseAdmin
          .from('tasks')
          .update({ status: 'done' })
          .eq('id', payload.task_id)
        break
      }

      case 'acknowledge': {
        // Just mark the notification as read
        break
      }

      default:
        return { success: false, message: `Unknown action: ${actionType}` }
    }

    // Mark action as taken and notification as read
    await supabaseAdmin
      .from('notifications')
      .update({ action_taken: true, is_read: true })
      .eq('id', notificationId)

    return { success: true, message: `Action "${actionType}" completed` }
  } catch (error) {
    console.error('[notification-action] Failed:', error)
    return { success: false, message: 'Action failed' }
  }
}
