import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { compileDigest, buildDigestEmailHtml } from '@/lib/notifications/digest'
import { sendEmail } from '@/lib/email/send'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const dayOfWeek = now.getUTCDay() // 0 = Sunday, 1 = Monday

    // Find users who want daily or weekly digests
    const { data: prefs } = await supabaseAdmin
      .from('notification_preferences')
      .select('user_id, organization_id, digest_frequency')
      .in('digest_frequency', ['daily', 'weekly'])

    if (!prefs?.length) {
      return NextResponse.json({ sent: 0, message: 'No digest subscribers' })
    }

    // Deduplicate by user + org (a user may have multiple event type preferences)
    const userOrgs = new Map<string, { userId: string; orgId: string; frequency: string }>()
    for (const pref of prefs) {
      const key = `${pref.user_id}:${pref.organization_id}`
      if (!userOrgs.has(key)) {
        userOrgs.set(key, {
          userId: pref.user_id,
          orgId: pref.organization_id,
          frequency: pref.digest_frequency,
        })
      }
    }

    let sent = 0

    for (const { userId, orgId, frequency } of userOrgs.values()) {
      // Weekly digests only send on Mondays
      if (frequency === 'weekly' && dayOfWeek !== 1) continue

      // Calculate "since" date
      const since = new Date(now)
      if (frequency === 'daily') {
        since.setDate(since.getDate() - 1)
      } else {
        since.setDate(since.getDate() - 7)
      }

      try {
        const result = await compileDigest(userId, orgId, since)
        if (!result || result.groups.length === 0) continue

        // Get user email
        const { data } = await supabaseAdmin.auth.admin.getUserById(userId)
        const email = data?.user?.email
        if (!email) continue

        // Build and send digest email
        const { subject, html } = buildDigestEmailHtml(
          result.groups,
          frequency as 'daily' | 'weekly'
        )

        await sendEmail({ to: email, subject, html })
        sent++
      } catch (error) {
        console.error('[digest] Failed for user:', userId, error)
      }
    }

    return NextResponse.json({ sent })
  } catch (error) {
    console.error('[digest] Cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
