import { supabaseAdmin } from '@/lib/supabase/admin'
import { trackEvent } from './analytics'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import type { NotificationType } from '@/types/enums'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

const TYPE_EMOJI: Record<string, string> = {
  task_assigned: ':bust_in_silhouette:',
  task_status_changed: ':arrows_counterclockwise:',
  comment_added: ':speech_balloon:',
  due_date_approaching: ':alarm_clock:',
  content_scheduled: ':calendar:',
  content_published: ':white_check_mark:',
  meeting_starting: ':video_camera:',
}

interface SlackPayload {
  type: NotificationType
  title: string
  body?: string | null
  link?: string | null
  notificationId: string
}

export async function sendSlackNotification(
  orgId: string,
  payload: SlackPayload
): Promise<void> {
  try {
    // Fetch active Slack integration for this org
    const { data: integration } = await supabaseAdmin
      .from('organization_integrations')
      .select('config')
      .eq('organization_id', orgId)
      .eq('type', 'slack')
      .eq('is_active', true)
      .maybeSingle()

    const webhookUrl = (integration?.config as Record<string, unknown>)?.webhook_url as string | undefined
    if (!webhookUrl) return

    const emoji = TYPE_EMOJI[payload.type] ?? ':bell:'
    const label = NOTIFICATION_TYPE_LABELS[payload.type] ?? payload.type

    const blocks: Record<string, unknown>[] = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${payload.title}*`,
        },
      },
    ]

    if (payload.body) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: payload.body,
          },
        ],
      })
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `_${label}_ • Agency Beats`,
        },
      ],
    })

    if (payload.link) {
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View in Agency Beats',
              emoji: true,
            },
            url: `${APP_URL}${payload.link}`,
            action_id: 'view_notification',
          },
        ],
      })
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    })

    await trackEvent(
      payload.notificationId,
      'slack',
      res.ok ? 'delivered' : 'failed',
      res.ok ? undefined : { status: res.status }
    )
  } catch (error) {
    console.error('[slack] Failed to send:', error)
    await trackEvent(payload.notificationId, 'slack', 'failed', {
      error: String(error),
    }).catch(() => {})
  }
}

export async function testSlackWebhook(webhookUrl: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: ':wave: *Agency Beats connected!* Slack notifications are working.',
            },
          },
        ],
      }),
    })
    return res.ok
  } catch {
    return false
  }
}
