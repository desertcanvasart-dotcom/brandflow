import { supabaseAdmin } from '@/lib/supabase/admin'
import { NOTIFICATION_TYPE_LABELS } from '@/lib/constants'
import type { NotificationType } from '@/types/enums'
import type { Database } from '@/types/database'

type NotificationRow = Database['public']['Tables']['notifications']['Row']

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

interface DigestGroup {
  type: NotificationType
  label: string
  count: number
  items: Array<{ title: string; link: string | null; created_at: string }>
}

export async function compileDigest(
  userId: string,
  orgId: string,
  since: Date
): Promise<{ groups: DigestGroup[]; notificationIds: string[] } | null> {
  const { data: notifications } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .eq('is_archived', false)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .returns<NotificationRow[]>()

  if (!notifications?.length) return null

  // Group by type
  const grouped = new Map<string, DigestGroup>()
  const notificationIds: string[] = []

  for (const n of notifications) {
    notificationIds.push(n.id)
    const type = n.type as NotificationType
    const existing = grouped.get(type)

    if (existing) {
      existing.count++
      if (existing.items.length < 5) {
        existing.items.push({ title: n.title, link: n.link, created_at: n.created_at })
      }
    } else {
      grouped.set(type, {
        type,
        label: NOTIFICATION_TYPE_LABELS[type] ?? type,
        count: 1,
        items: [{ title: n.title, link: n.link, created_at: n.created_at }],
      })
    }
  }

  return {
    groups: Array.from(grouped.values()).sort((a, b) => b.count - a.count),
    notificationIds,
  }
}

export function buildDigestEmailHtml(
  groups: DigestGroup[],
  period: 'daily' | 'weekly'
): { subject: string; html: string } {
  const totalCount = groups.reduce((sum, g) => sum + g.count, 0)
  const periodLabel = period === 'daily' ? 'Daily' : 'Weekly'

  let sectionsHtml = ''
  for (const group of groups) {
    let itemsHtml = ''
    for (const item of group.items) {
      const linkHtml = item.link
        ? `<a href="${APP_URL}${item.link}" style="color:#4f46e5;text-decoration:none;">${item.title}</a>`
        : item.title
      itemsHtml += `<li style="margin:4px 0;font-size:14px;color:#3f3f46;">${linkHtml}</li>`
    }
    if (group.count > group.items.length) {
      itemsHtml += `<li style="margin:4px 0;font-size:13px;color:#71717a;">...and ${group.count - group.items.length} more</li>`
    }

    sectionsHtml += `
      <div style="margin:16px 0;">
        <h3 style="margin:0 0 8px;font-size:15px;color:#18181b;">
          ${group.label} (${group.count})
        </h3>
        <ul style="margin:0;padding:0 0 0 20px;">${itemsHtml}</ul>
      </div>
    `
  }

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${periodLabel} Digest</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#18181b;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Agency Beats</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#18181b;">Your ${periodLabel} Digest</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#71717a;">${totalCount} notification${totalCount !== 1 ? 's' : ''} since your last digest</p>
          ${sectionsHtml}
          <div style="margin-top:24px;">
            <a href="${APP_URL}/notifications" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">View All Notifications</a>
          </div>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f4f4f5;text-align:center;">
          <span style="color:#71717a;font-size:12px;">Sent by Agency Beats. Manage your notification preferences in Settings.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  return {
    subject: `${periodLabel} Digest: ${totalCount} notification${totalCount !== 1 ? 's' : ''}`,
    html,
  }
}
