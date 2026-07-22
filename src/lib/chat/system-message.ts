import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type SystemEvent =
  | 'task_completed'
  | 'brief_submitted'
  | 'member_joined'
  | 'meeting_completed'
  | 'task_created_from_chat'
  | 'decision_marked'
  | 'message_pinned'

/**
 * Insert a system message into a project's chat channel.
 * System messages have user_id = null and attachments indicating the event type.
 * Fire-and-forget — errors are logged but do not throw.
 */
export async function insertSystemMessage(params: {
  supabase: SupabaseClient<Database>
  projectId: string
  event: SystemEvent
  content: string
}): Promise<void> {
  try {
    // Look up the project's chat channel
    const { data: channel } = await params.supabase
      .from('channels')
      .select('id')
      .eq('project_id', params.projectId)
      .eq('type', 'project')
      .single()

    if (!channel) return

    await params.supabase.from('channel_messages').insert({
      channel_id: channel.id,
      user_id: null,
      content: params.content,
      attachments: JSON.stringify([{ type: 'system', event: params.event }]),
    })
  } catch (error) {
    console.error('[chat] Failed to insert system message:', error)
  }
}

/**
 * Insert a system message directly into a channel (by channelId).
 * Use this for channels that may not be project-based (org channels, DMs).
 */
export async function insertSystemMessageByChannel(params: {
  supabase: SupabaseClient<Database>
  channelId: string
  event: SystemEvent
  content: string
}): Promise<void> {
  try {
    await params.supabase.from('channel_messages').insert({
      channel_id: params.channelId,
      user_id: null,
      content: params.content,
      attachments: JSON.stringify([{ type: 'system', event: params.event }]),
    })
  } catch (error) {
    console.error('[chat] Failed to insert system message:', error)
  }
}
