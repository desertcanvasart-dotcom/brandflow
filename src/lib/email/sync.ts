/**
 * Email sync engine — handles initial sync, incremental sync, and
 * processing of individual threads from providers.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getEmailProvider } from './providers/factory'
import { autoLinkThread } from './auto-link'
import { decrypt } from './encryption'
import type { ProviderThread, ProviderMessage } from './providers/types'
import type { Database } from '@/types/database'

type EmailConnectionRow = Database['public']['Tables']['email_connections']['Row']

// ─── Initial Sync ──────────────────────────────────────────────

/**
 * Run an initial sync for a newly connected account.
 * Fetches threads from the last 30 days that match brand contacts.
 */
export async function syncInitial(connectionId: string): Promise<void> {
  const connection = await getConnection(connectionId)
  if (!connection) throw new Error(`Connection ${connectionId} not found`)

  const provider = getEmailProvider(connection)

  // Get all brand contact emails for this org (for filtering)
  const contactEmails = await getOrgContactEmails(connection.organization_id)

  const since = new Date()
  since.setDate(since.getDate() - 30)

  let cursor: string | undefined
  let totalProcessed = 0
  const MAX_THREADS = 200 // Safety cap for initial sync

  do {
    const result = await provider.fetchThreads({
      cursor,
      contactEmails: contactEmails.length > 0 ? contactEmails : undefined,
      maxResults: 50,
      since: since.toISOString(),
    })

    for (const thread of result.threads) {
      await processThread(connection, thread)
      totalProcessed++
    }

    cursor = result.nextCursor

    if (totalProcessed >= MAX_THREADS) break
  } while (cursor)

  // Update last_synced_at
  await supabaseAdmin
    .from('email_connections')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', connectionId)
}

// ─── Incremental Sync ──────────────────────────────────────────

/**
 * Run an incremental sync using the stored cursor (historyId / deltaLink).
 * Falls back to fetchThreads if no cursor exists.
 */
export async function syncIncremental(connectionId: string): Promise<void> {
  const connection = await getConnection(connectionId)
  if (!connection || !connection.is_active) return

  const provider = getEmailProvider(connection)

  if (!connection.sync_cursor) {
    // No cursor yet — do a small initial fetch
    await syncInitial(connectionId)
    return
  }

  try {
    const changes = await provider.getChanges(connection.sync_cursor)

    for (const thread of changes.threads) {
      await processThread(connection, thread)
    }

    // Update cursor and last_synced_at
    await supabaseAdmin
      .from('email_connections')
      .update({
        sync_cursor: changes.newCursor,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', connectionId)
  } catch (err) {
    console.error(`Incremental sync failed for connection ${connectionId}:`, err)

    // If the cursor is invalid (e.g., historyId expired), clear it so next sync re-initializes
    if (err instanceof Error && err.message.includes('invalid')) {
      await supabaseAdmin
        .from('email_connections')
        .update({ sync_cursor: null })
        .eq('id', connectionId)
    }
  }
}

// ─── Process Individual Thread ─────────────────────────────────

/**
 * Upsert a single provider thread and its messages into the database.
 * Auto-links to a project if participants match brand contacts.
 */
export async function processThread(
  connection: EmailConnectionRow,
  providerThread: ProviderThread,
): Promise<void> {
  const orgId = connection.organization_id

  // Check if thread already exists
  const { data: existing } = await supabaseAdmin
    .from('email_threads')
    .select('id, project_id, brand_id')
    .eq('connection_id', connection.id)
    .eq('provider_thread_id', providerThread.threadId)
    .single()

  // Auto-link if not already linked to a project
  let projectId = existing?.project_id ?? undefined
  let brandId = existing?.brand_id ?? undefined

  if (!projectId) {
    const link = await autoLinkThread(orgId, providerThread.participants)
    projectId = link.projectId
    brandId = link.brandId
  }

  // Upsert the thread
  const { data: thread, error: threadError } = await supabaseAdmin
    .from('email_threads')
    .upsert(
      {
        id: existing?.id ?? undefined,
        organization_id: orgId,
        connection_id: connection.id,
        project_id: projectId ?? null,
        brand_id: brandId ?? null,
        provider_thread_id: providerThread.threadId,
        subject: providerThread.subject,
        snippet: providerThread.snippet,
        participants: providerThread.participants,
        last_message_at: providerThread.lastMessageAt,
        message_count: providerThread.messageCount,
        is_read: providerThread.isRead,
      },
      { onConflict: 'connection_id,provider_thread_id' },
    )
    .select('id')
    .single()

  if (threadError || !thread) {
    console.error('Failed to upsert email_thread:', threadError)
    return
  }

  // Upsert messages
  for (const msg of providerThread.messages) {
    await processMessage(thread.id, msg, connection.email_address)
  }
}

/**
 * Upsert a single message into the database.
 */
async function processMessage(
  threadId: string,
  msg: ProviderMessage,
  connectedEmail: string,
): Promise<void> {
  // Check if message already exists
  const { data: existingMsg } = await supabaseAdmin
    .from('email_messages')
    .select('id')
    .eq('thread_id', threadId)
    .eq('provider_message_id', msg.messageId)
    .single()

  if (existingMsg) return // Already synced

  const isOutbound =
    msg.from.address.toLowerCase() === connectedEmail.toLowerCase()

  const { data: savedMsg, error: msgError } = await supabaseAdmin
    .from('email_messages')
    .insert({
      thread_id: threadId,
      provider_message_id: msg.messageId,
      from_address: msg.from.address,
      from_name: msg.from.name ?? null,
      to_addresses: msg.to.map((t) => t.address),
      cc_addresses: msg.cc?.map((c) => c.address) ?? [],
      bcc_addresses: msg.bcc?.map((b) => b.address) ?? [],
      subject: msg.subject,
      body_html: msg.bodyHtml ?? null,
      body_text: msg.bodyText ?? null,
      sent_at: msg.sentAt,
      is_outbound: isOutbound,
      headers: {
        messageId: msg.headers.messageId,
        inReplyTo: msg.headers.inReplyTo,
        references: msg.headers.references,
      },
    })
    .select('id')
    .single()

  if (msgError) {
    console.error('Failed to insert email_message:', msgError)
    return
  }

  // Insert attachment records (storage URL filled later on download)
  if (msg.attachments.length > 0 && savedMsg) {
    const attachmentRows = msg.attachments.map((att) => ({
      message_id: savedMsg.id,
      file_name: att.fileName,
      content_type: att.contentType,
      size_bytes: att.sizeBytes,
      provider_attachment_id: att.attachmentId,
    }))

    const { error: attError } = await supabaseAdmin
      .from('email_attachments')
      .insert(attachmentRows)

    if (attError) {
      console.error('Failed to insert email_attachments:', attError)
    }
  }
}

// ─── Helpers ───────────────────────────────────────────────────

async function getConnection(connectionId: string): Promise<EmailConnectionRow | null> {
  const { data } = await supabaseAdmin
    .from('email_connections')
    .select('*')
    .eq('id', connectionId)
    .returns<EmailConnectionRow[]>()
    .single()

  return data
}

/**
 * Get all brand contact emails for an organization.
 */
async function getOrgContactEmails(orgId: string): Promise<string[]> {
  const { data: contacts } = await supabaseAdmin
    .from('brand_contacts')
    .select('email, brands!inner(organization_id)')
    .not('email', 'is', null)

  if (!contacts) return []

  return contacts
    .filter(
      (c) => (c.brands as unknown as { organization_id: string })?.organization_id === orgId,
    )
    .map((c) => c.email!)
    .filter(Boolean)
}

/**
 * Set up push notifications for a connection.
 */
export async function setupConnectionWatch(connectionId: string): Promise<void> {
  const connection = await getConnection(connectionId)
  if (!connection || !connection.is_active) return

  const provider = getEmailProvider(connection)
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/email`

  try {
    const result = await provider.setupWatch(webhookUrl)

    await supabaseAdmin
      .from('email_connections')
      .update({
        watch_resource_id: result.resourceId,
        watch_expiry: result.expiry,
      })
      .eq('id', connectionId)
  } catch (err) {
    console.error(`Failed to setup watch for connection ${connectionId}:`, err)
  }
}

/**
 * Stop push notifications for a connection.
 */
export async function stopConnectionWatch(connectionId: string): Promise<void> {
  const connection = await getConnection(connectionId)
  if (!connection || !connection.watch_resource_id) return

  const provider = getEmailProvider(connection)

  try {
    await provider.stopWatch(connection.watch_resource_id)
  } catch (err) {
    console.error(`Failed to stop watch for connection ${connectionId}:`, err)
  }

  await supabaseAdmin
    .from('email_connections')
    .update({
      watch_resource_id: null,
      watch_expiry: null,
    })
    .eq('id', connectionId)
}
