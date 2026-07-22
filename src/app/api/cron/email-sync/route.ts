/**
 * Cron job: Incremental email sync (every 15 minutes).
 *
 * For each active email connection, runs an incremental sync to catch
 * any messages that push notifications might have missed.
 *
 * Triggered by external cron (e.g., Railway cron or Vercel cron).
 * Protected by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { syncIncremental } from '@/lib/email/sync'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get all active email connections
    const { data: connections, error } = await supabaseAdmin
      .from('email_connections')
      .select('id, provider, email_address')
      .eq('is_active', true)

    if (error || !connections) {
      console.error('Failed to fetch email connections:', error)
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 })
    }

    const results: { id: string; status: string }[] = []

    // Process connections sequentially to avoid rate limits
    for (const conn of connections) {
      try {
        await syncIncremental(conn.id)
        results.push({ id: conn.id, status: 'ok' })
      } catch (err) {
        console.error(`Sync failed for connection ${conn.id} (${conn.email_address}):`, err)
        results.push({ id: conn.id, status: 'error' })
      }
    }

    return NextResponse.json({
      synced: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      total: connections.length,
    })
  } catch (error) {
    console.error('Email sync cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
