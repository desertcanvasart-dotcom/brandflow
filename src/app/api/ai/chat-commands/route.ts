import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { defaultModel } from '@/lib/ai/provider'
import {
  CHAT_SUMMARIZE_PROMPT,
  CHAT_EXTRACT_TASKS_PROMPT,
  CHAT_EXTRACT_DECISIONS_PROMPT,
} from '@/lib/ai/prompts'
import type { Database } from '@/types/database'

const COMMAND_PROMPTS: Record<string, string> = {
  summarize: CHAT_SUMMARIZE_PROMPT,
  tasks: CHAT_EXTRACT_TASKS_PROMPT,
  decisions: CHAT_EXTRACT_DECISIONS_PROMPT,
}

const COMMAND_LABELS: Record<string, string> = {
  summarize: 'Chat Summary',
  tasks: 'Extracted Tasks',
  decisions: 'Extracted Decisions',
}

export async function POST(request: Request) {
  try {
    // Get auth token from cookie
    const cookieHeader = request.headers.get('cookie') ?? ''
    const authToken = cookieHeader
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('sb-'))
      ?.split('=')
      .slice(1)
      .join('=')

    // Create authenticated Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: authToken
          ? { Authorization: `Bearer ${authToken}` }
          : {},
      },
    })

    // Verify user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { command, channelId } = body as { command: string; channelId: string }

    if (!command || !channelId) {
      return NextResponse.json({ error: 'Missing command or channelId' }, { status: 400 })
    }

    const systemPrompt = COMMAND_PROMPTS[command]
    if (!systemPrompt) {
      return NextResponse.json({ error: 'Unknown command' }, { status: 400 })
    }

    // Fetch last 20 messages from channel
    const { data: messages, error: msgError } = await supabase
      .from('channel_messages')
      .select('content, user_id, created_at')
      .eq('channel_id', channelId)
      .is('parent_message_id', null)
      .order('created_at', { ascending: false })
      .limit(20)

    if (msgError) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages to analyze' }, { status: 400 })
    }

    // Get user profiles for display names
    const userIds = [...new Set(messages.filter((m) => m.user_id).map((m) => m.user_id!))]

    // Get org_id from RPC
    const { data: orgId } = await supabase.rpc('org_id')

    const userMap = new Map<string, string>()
    if (userIds.length > 0 && orgId) {
      const { data: members } = await supabase
        .from('organization_members')
        .select('user_id, display_name')
        .eq('organization_id', orgId as string)
        .in('user_id', userIds)

      type M = { user_id: string; display_name: string | null }
      for (const m of (members ?? []) as M[]) {
        userMap.set(m.user_id, m.display_name ?? 'Unknown')
      }
    }

    // Format messages for the AI
    const formattedMessages = messages
      .reverse()
      .map((m) => {
        const name = m.user_id ? userMap.get(m.user_id) ?? 'Unknown' : 'System'
        const time = new Date(m.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })
        // Strip mention markup
        const content = m.content.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')
        return `[${time}] ${name}: ${content}`
      })
      .join('\n')

    // Generate AI response
    const { text } = await generateText({
      model: defaultModel,
      system: systemPrompt,
      prompt: `Here are the recent chat messages:\n\n${formattedMessages}`,
    })

    // Insert AI response as a system message in the channel
    await supabase.from('channel_messages').insert({
      channel_id: channelId,
      user_id: null,
      content: text,
      attachments: JSON.stringify([
        { type: 'ai_response', command, label: COMMAND_LABELS[command] ?? command },
      ]),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ai/chat-commands] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
