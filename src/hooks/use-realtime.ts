'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trpc } from '@/trpc/client'

/**
 * Subscribe to Supabase realtime changes and invalidate relevant TanStack Query caches.
 * Mount this once in the dashboard layout.
 */
export function useRealtimeInvalidation() {
  const utils = trpc.useUtils()

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          utils.task.list.invalidate()
          utils.task.listByBoard.invalidate()
          utils.calendar.getContentByRange.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          utils.project.list.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          utils.comment.list.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_items' },
        () => {
          utils.content.listByTaskId.invalidate()
          utils.calendar.getTasksByRange.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'phases' },
        () => {
          utils.phase.list.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brands' },
        () => {
          utils.brand.list.invalidate()
        }
      )
      // Phase 3: notifications
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          utils.notification.unreadCount.invalidate()
          utils.notification.list.invalidate()
        }
      )
      // Phase 2: meetings & annotations
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meetings' },
        () => {
          utils.meeting.list.invalidate()
          utils.meeting.upcoming.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'annotations' },
        () => {
          utils.annotation.list.invalidate()
        }
      )
      // Meeting rooms: sessions & participants
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'meeting_sessions' },
        () => {
          utils.meetingRoom.listSessions.invalidate()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_participants' },
        () => {
          utils.meetingRoom.getSession.invalidate()
        }
      )
      // Team Chat: global unread badge updates
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'channel_messages' },
        () => {
          utils.chat.getChannelByProject.invalidate()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [utils])
}

export function useRealtimeTable(
  table: string,
  filter: { column: string; value: string },
  onChange?: () => void
) {
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`${table}:${filter.value}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `${filter.column}=eq.${filter.value}`,
      }, () => {
        onChange?.()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter.column, filter.value, onChange])
}
