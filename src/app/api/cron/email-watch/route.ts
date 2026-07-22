/**
 * Cron job: Renew email watches and refresh tokens (every 6 hours).
 *
 * - Renews Gmail Watch API registrations (7-day expiry) expiring within 24h
 * - Renews Graph subscriptions (3-day expiry) expiring within 24h
 * - Refreshes OAuth tokens expiring within 1 hour
 *
 * Triggered by external cron. Protected by CRON_SECRET header.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { setupConnectionWatch } from '@/lib/email/sync'
import { refreshGmailToken, refreshOutlookToken } from '@/lib/email/oauth'
import { encrypt, decrypt } from '@/lib/email/encryption'

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in1Hour = new Date(now.getTime() + 60 * 60 * 1000)

    let watchesRenewed = 0
    let tokensRefreshed = 0
    let errors = 0

    // ── 1. Renew expiring watches ────────────────────────────

    const { data: expiringWatches } = await supabaseAdmin
      .from('email_connections')
      .select('id, provider, email_address')
      .eq('is_active', true)
      .not('watch_resource_id', 'is', null)
      .lt('watch_expiry', in24Hours.toISOString())

    if (expiringWatches) {
      for (const conn of expiringWatches) {
        try {
          await setupConnectionWatch(conn.id)
          watchesRenewed++
        } catch (err) {
          console.error(`Failed to renew watch for ${conn.email_address}:`, err)
          errors++
        }
      }
    }

    // ── 2. Refresh expiring tokens ───────────────────────────

    const { data: expiringTokens } = await supabaseAdmin
      .from('email_connections')
      .select('id, provider, email_address, refresh_token, access_token')
      .eq('is_active', true)
      .not('refresh_token', 'is', null)
      .lt('token_expires_at', in1Hour.toISOString())

    if (expiringTokens) {
      for (const conn of expiringTokens) {
        try {
          if (!conn.refresh_token) continue

          const decryptedRefreshToken = decrypt(conn.refresh_token)
          let newTokens: { access_token: string; expires_in: number; refresh_token?: string }

          if (conn.provider === 'gmail') {
            newTokens = await refreshGmailToken(decryptedRefreshToken)
          } else {
            newTokens = await refreshOutlookToken(decryptedRefreshToken)
          }

          const updateData: Record<string, string | null> = {
            access_token: encrypt(newTokens.access_token),
            token_expires_at: new Date(
              Date.now() + newTokens.expires_in * 1000,
            ).toISOString(),
          }

          // Outlook may return a new refresh token
          if (newTokens.refresh_token) {
            updateData.refresh_token = encrypt(newTokens.refresh_token)
          }

          await supabaseAdmin
            .from('email_connections')
            .update(updateData)
            .eq('id', conn.id)

          tokensRefreshed++
        } catch (err) {
          console.error(`Failed to refresh token for ${conn.email_address}:`, err)
          errors++

          // If refresh fails (token revoked), mark connection as inactive
          if (err instanceof Error && (err.message.includes('invalid_grant') || err.message.includes('revoked'))) {
            await supabaseAdmin
              .from('email_connections')
              .update({ is_active: false })
              .eq('id', conn.id)
          }
        }
      }
    }

    // ── 3. Setup watches for connections without one ──────────

    const { data: noWatch } = await supabaseAdmin
      .from('email_connections')
      .select('id, email_address')
      .eq('is_active', true)
      .is('watch_resource_id', null)

    if (noWatch) {
      for (const conn of noWatch) {
        try {
          await setupConnectionWatch(conn.id)
          watchesRenewed++
        } catch (err) {
          console.error(`Failed to setup watch for ${conn.email_address}:`, err)
          errors++
        }
      }
    }

    return NextResponse.json({
      watchesRenewed,
      tokensRefreshed,
      errors,
    })
  } catch (error) {
    console.error('Email watch cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
