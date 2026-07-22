/**
 * Webhook endpoint for email push notifications.
 *
 * Gmail: receives Pub/Sub push notifications
 * Outlook: receives Graph subscription notifications
 *
 * Both trigger an incremental sync on the relevant connection.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { syncIncremental } from '@/lib/email/sync'

// ─── Gmail Pub/Sub Push ────────────────────────────────────────

interface GmailPushPayload {
  message: {
    data: string // base64-encoded JSON: { emailAddress, historyId }
    messageId: string
    publishTime: string
  }
  subscription: string
}

// ─── Outlook Graph Subscription ────────────────────────────────

interface OutlookNotification {
  value: Array<{
    subscriptionId: string
    clientState?: string
    changeType: string
    resource: string
    resourceData?: {
      id: string
    }
  }>
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') ?? ''

    // Outlook validation token (subscription setup handshake)
    const validationToken = request.nextUrl.searchParams.get('validationToken')
    if (validationToken) {
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    }

    const body = await request.json()

    // Detect if it's a Gmail Pub/Sub push or Outlook Graph notification
    if (body.message?.data) {
      // ── Gmail Pub/Sub
      await handleGmailPush(body as GmailPushPayload)
    } else if (body.value && Array.isArray(body.value)) {
      // ── Outlook Graph Subscription
      await handleOutlookNotification(body as OutlookNotification)
    } else {
      console.warn('Unknown webhook payload shape:', JSON.stringify(body).slice(0, 200))
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Email webhook error:', error)
    // Always return 200 to avoid providers retrying endlessly
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

async function handleGmailPush(payload: GmailPushPayload): Promise<void> {
  // Decode the Pub/Sub data
  const decoded = JSON.parse(
    Buffer.from(payload.message.data, 'base64').toString('utf8'),
  ) as { emailAddress: string; historyId: string }

  const { emailAddress, historyId } = decoded

  // Find the connection for this email address
  const { data: connection } = await supabaseAdmin
    .from('email_connections')
    .select('id')
    .eq('provider', 'gmail')
    .eq('email_address', emailAddress)
    .eq('is_active', true)
    .single()

  if (!connection) {
    console.warn(`No active Gmail connection for ${emailAddress}`)
    return
  }

  // Update the sync cursor with the new historyId and run incremental sync
  await supabaseAdmin
    .from('email_connections')
    .update({ sync_cursor: historyId })
    .eq('id', connection.id)

  await syncIncremental(connection.id)
}

async function handleOutlookNotification(payload: OutlookNotification): Promise<void> {
  for (const notification of payload.value) {
    const { subscriptionId, clientState } = notification

    // Verify client state if configured
    if (process.env.OUTLOOK_WEBHOOK_SECRET && clientState !== process.env.OUTLOOK_WEBHOOK_SECRET) {
      console.warn('Outlook webhook client state mismatch')
      continue
    }

    // Find the connection by watch_resource_id (subscription ID)
    const { data: connection } = await supabaseAdmin
      .from('email_connections')
      .select('id')
      .eq('provider', 'outlook')
      .eq('watch_resource_id', subscriptionId)
      .eq('is_active', true)
      .single()

    if (!connection) {
      console.warn(`No active Outlook connection for subscription ${subscriptionId}`)
      continue
    }

    await syncIncremental(connection.id)
  }
}
