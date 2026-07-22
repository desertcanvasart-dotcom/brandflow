/**
 * Google Calendar sync engine.
 * Read-only sync: fetches events from Google Calendar and upserts them into calendar_events.
 */

import { supabaseAdmin } from '@/lib/supabase/admin'
import { decrypt, encrypt } from '@/lib/email/encryption'
import { refreshGoogleCalendarToken } from './google-oauth'
import type { Database } from '@/types/database'

type CalendarConnectionRow = Database['public']['Tables']['google_calendar_connections']['Row']

interface GoogleCalendarEvent {
  id: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string }
  end?: { dateTime?: string; date?: string }
  location?: string
  status?: string
  attendees?: Array<{ email: string; displayName?: string; responseStatus?: string }>
}

interface GoogleCalendarResponse {
  items?: GoogleCalendarEvent[]
  nextSyncToken?: string
  nextPageToken?: string
}

export async function syncGoogleCalendar(connectionId: string): Promise<void> {
  // Load connection
  const { data: conn, error: connError } = await supabaseAdmin
    .from('google_calendar_connections')
    .select('*')
    .eq('id', connectionId)
    .single<CalendarConnectionRow>()

  if (connError || !conn) {
    console.error('[gcal-sync] Connection not found:', connectionId)
    return
  }

  if (!conn.is_active) return

  // Decrypt tokens
  let accessToken = decrypt(conn.access_token)
  const refreshToken = conn.refresh_token ? decrypt(conn.refresh_token) : null

  // Refresh token if expired or expiring within 5 minutes
  const expiresAt = conn.token_expires_at ? new Date(conn.token_expires_at) : null
  if (expiresAt && expiresAt.getTime() < Date.now() + 5 * 60 * 1000) {
    if (!refreshToken) {
      console.error('[gcal-sync] Token expired and no refresh token available')
      await supabaseAdmin
        .from('google_calendar_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
      return
    }

    try {
      const refreshed = await refreshGoogleCalendarToken(refreshToken)
      accessToken = refreshed.access_token

      await supabaseAdmin
        .from('google_calendar_connections')
        .update({
          access_token: encrypt(accessToken),
          token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        })
        .eq('id', connectionId)
    } catch (err) {
      console.error('[gcal-sync] Token refresh failed:', err)
      await supabaseAdmin
        .from('google_calendar_connections')
        .update({ is_active: false })
        .eq('id', connectionId)
      return
    }
  }

  // Fetch events from Google Calendar API
  try {
    let allEvents: GoogleCalendarEvent[] = []
    let pageToken: string | undefined
    let nextSyncToken: string | undefined

    const baseParams: Record<string, string> = {
      maxResults: '250',
      singleEvents: 'true',
      orderBy: 'startTime',
    }

    // Use syncToken for incremental sync, or timeMin/timeMax for full sync
    if (conn.sync_token) {
      baseParams.syncToken = conn.sync_token
    } else {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const ninetyDaysAhead = new Date()
      ninetyDaysAhead.setDate(ninetyDaysAhead.getDate() + 90)

      baseParams.timeMin = thirtyDaysAgo.toISOString()
      baseParams.timeMax = ninetyDaysAhead.toISOString()
    }

    do {
      const params = new URLSearchParams(baseParams)
      if (pageToken) params.set('pageToken', pageToken)

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (res.status === 410) {
        // Sync token expired — do a full sync
        console.log('[gcal-sync] Sync token expired, performing full sync')
        await supabaseAdmin
          .from('google_calendar_connections')
          .update({ sync_token: null })
          .eq('id', connectionId)
        // Retry without sync token
        return syncGoogleCalendar(connectionId)
      }

      if (!res.ok) {
        const text = await res.text()
        console.error('[gcal-sync] API error:', text)
        return
      }

      const data: GoogleCalendarResponse = await res.json()
      if (data.items) allEvents = allEvents.concat(data.items)
      pageToken = data.nextPageToken
      if (data.nextSyncToken) nextSyncToken = data.nextSyncToken
    } while (pageToken)

    // Upsert events into calendar_events
    for (const event of allEvents) {
      if (!event.start) continue // skip cancelled events with no start

      const startsAt = event.start.dateTime ?? event.start.date
      const endsAt = event.end?.dateTime ?? event.end?.date ?? startsAt
      const isAllDay = !event.start.dateTime

      if (!startsAt) continue

      // Check if event already exists
      const { data: existing } = await supabaseAdmin
        .from('calendar_events')
        .select('id')
        .eq('google_event_id', event.id)
        .eq('organization_id', conn.organization_id)
        .single()

      if (event.status === 'cancelled') {
        // Delete cancelled events
        if (existing) {
          await supabaseAdmin
            .from('calendar_events')
            .delete()
            .eq('id', existing.id)
        }
        continue
      }

      const eventData = {
        organization_id: conn.organization_id,
        title: event.summary ?? 'Untitled Event',
        description: event.description ?? null,
        starts_at: new Date(startsAt!).toISOString(),
        ends_at: new Date(endsAt!).toISOString(),
        is_all_day: isAllDay,
        location: event.location ?? null,
        google_event_id: event.id,
        created_by: conn.user_id,
      }

      if (existing) {
        await supabaseAdmin
          .from('calendar_events')
          .update(eventData)
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('calendar_events')
          .insert(eventData)
      }
    }

    // Update sync token and last_synced_at
    await supabaseAdmin
      .from('google_calendar_connections')
      .update({
        sync_token: nextSyncToken ?? conn.sync_token,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    console.log(`[gcal-sync] Synced ${allEvents.length} events for connection ${connectionId}`)
  } catch (err) {
    console.error('[gcal-sync] Sync error:', err)
  }
}
