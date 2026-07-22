import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Auto-archive: notifications older than 30 days
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: archived } = await supabaseAdmin
      .from('notifications')
      .update({
        is_archived: true,
        archived_at: now.toISOString(),
      })
      .eq('is_archived', false)
      .lt('created_at', thirtyDaysAgo.toISOString())
      .select('*', { count: 'exact', head: true })

    // Retention: hard-delete archived notifications older than 90 days
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { count: deleted } = await supabaseAdmin
      .from('notifications')
      .delete()
      .eq('is_archived', true)
      .lt('archived_at', ninetyDaysAgo.toISOString())
      .select('*', { count: 'exact', head: true })

    // Clean up old processed queue items (older than 7 days)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    await supabaseAdmin
      .from('notification_queue')
      .delete()
      .eq('is_processed', true)
      .lt('processed_at', sevenDaysAgo.toISOString())

    return NextResponse.json({
      archived: archived ?? 0,
      deleted: deleted ?? 0,
    })
  } catch (error) {
    console.error('[archive] Cron failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
