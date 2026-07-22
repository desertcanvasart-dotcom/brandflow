import { supabaseAdmin } from '@/lib/supabase/admin'
import { syncGoogleCalendar } from '@/lib/calendar/google-sync'

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active Google Calendar connections
    const { data: connections, error } = await supabaseAdmin
      .from('google_calendar_connections')
      .select('id')
      .eq('is_active', true)

    if (error || !connections) {
      console.error('[calendar-sync cron] Failed to fetch connections:', error)
      return Response.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    console.log(`[calendar-sync cron] Syncing ${connections.length} connections`)

    // Sync each connection
    const results = await Promise.allSettled(
      connections.map((conn) => syncGoogleCalendar(conn.id))
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return Response.json({
      total: connections.length,
      succeeded,
      failed,
    })
  } catch (err: any) {
    console.error('[calendar-sync cron] Error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}
