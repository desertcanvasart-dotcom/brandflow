'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveUser {
  userId: string
  name: string
  avatarUrl?: string
  activeField: string | null
}

export interface FieldLock {
  userId: string
  name: string
}

export interface ConflictInfo {
  field: string
  myValue: unknown
  theirValue: unknown
  theirUserId: string
  theirName: string
}

interface UseCollaborativeDocumentReturn {
  /** Current merged form state */
  formData: Record<string, unknown>
  /** Update a single field locally + broadcast to peers */
  setField: (field: string, value: unknown) => void
  /** List of users currently viewing the document */
  presence: ActiveUser[]
  /** Fields currently being edited by other users */
  fieldLocks: Record<string, FieldLock>
  /** Active conflict (if another user edited the same field you are editing) */
  conflict: ConflictInfo | null
  /** Accept a value for the conflicted field and broadcast it */
  resolveConflict: (chosenValue: unknown) => void
  /** Dismiss the conflict without changing the current value */
  dismissConflict: () => void
}

// ---------------------------------------------------------------------------
// Disabled-state defaults (returned when documentId is null)
// ---------------------------------------------------------------------------

const EMPTY_PRESENCE: ActiveUser[] = []
const EMPTY_LOCKS: Record<string, FieldLock> = {}
const NOOP = () => {}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useCollaborativeDocument(
  documentId: string | null,
  currentUser: { id: string; name: string; avatarUrl?: string },
  initialData: Record<string, unknown>,
): UseCollaborativeDocumentReturn {
  // ---- local form state ---------------------------------------------------
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData)
  const [presence, setPresence] = useState<ActiveUser[]>(EMPTY_PRESENCE)
  const [fieldLocks, setFieldLocks] = useState<Record<string, FieldLock>>(EMPTY_LOCKS)
  const [conflict, setConflict] = useState<ConflictInfo | null>(null)

  // Refs for values needed inside callbacks without re-subscribing
  const channelRef = useRef<RealtimeChannel | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeFieldRef = useRef<string | null>(null)
  const formDataRef = useRef<Record<string, unknown>>(formData)
  const currentUserRef = useRef(currentUser)
  const lockTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // Keep refs in sync
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  // Sync initialData into formData when it changes (e.g. parent refetch)
  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  // ---- Channel lifecycle --------------------------------------------------
  useEffect(() => {
    if (!documentId) return

    const supabase = createClient()
    const channel = supabase.channel(`kb-doc:${documentId}`)
    channelRef.current = channel

    // -- Presence sync ------------------------------------------------------
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const users: ActiveUser[] = []
      const locks: Record<string, FieldLock> = {}

      for (const key of Object.keys(state)) {
        const presences = state[key] as unknown as Array<{
          userId: string
          name: string
          avatarUrl?: string
          activeField: string | null
        }>
        for (const p of presences) {
          users.push({
            userId: p.userId,
            name: p.name,
            avatarUrl: p.avatarUrl,
            activeField: p.activeField,
          })

          // Derive field locks from presence (skip self)
          if (p.activeField && p.userId !== currentUserRef.current.id) {
            locks[p.activeField] = { userId: p.userId, name: p.name }
          }
        }
      }

      setPresence(users)
      setFieldLocks(prev => {
        // Merge presence-derived locks with any broadcast-derived locks still
        // within their timeout window. Presence locks take precedence.
        const merged = { ...prev }
        // Remove stale presence-based locks for fields no longer active
        for (const field of Object.keys(merged)) {
          if (!locks[field] && !lockTimersRef.current[field]) {
            delete merged[field]
          }
        }
        return { ...merged, ...locks }
      })
    })

    // -- Broadcast: field updates from others --------------------------------
    channel.on('broadcast', { event: 'field_update' }, ({ payload }) => {
      const { field, value, userId, name } = payload as {
        field: string
        value: unknown
        userId: string
        name: string
      }

      // Ignore own echoed broadcasts
      if (userId === currentUserRef.current.id) return

      // Conflict detection: am I currently editing the same field?
      if (activeFieldRef.current === field) {
        setConflict({
          field,
          myValue: formDataRef.current[field],
          theirValue: value,
          theirUserId: userId,
          theirName: name,
        })
      } else {
        // No conflict — merge silently
        setFormData(prev => ({ ...prev, [field]: value }))
      }

      // Temporarily show field lock from broadcast (cleared after 2 s)
      setFieldLocks(prev => ({ ...prev, [field]: { userId, name } }))

      // Clear any existing timer for this field
      if (lockTimersRef.current[field]) {
        clearTimeout(lockTimersRef.current[field])
      }

      lockTimersRef.current[field] = setTimeout(() => {
        setFieldLocks(prev => {
          const next = { ...prev }
          if (next[field]?.userId === userId) delete next[field]
          return next
        })
        delete lockTimersRef.current[field]
      }, 2000)
    })

    // -- Subscribe & track presence -----------------------------------------
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          userId: currentUserRef.current.id,
          name: currentUserRef.current.name,
          avatarUrl: currentUserRef.current.avatarUrl,
          activeField: null,
        })
      }
    })

    // -- Cleanup ------------------------------------------------------------
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)

      // Clear all lock timers
      for (const timer of Object.values(lockTimersRef.current)) {
        clearTimeout(timer)
      }
      lockTimersRef.current = {}

      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [documentId])

  // ---- setField -----------------------------------------------------------
  const setField = useCallback(
    (field: string, value: unknown) => {
      if (!channelRef.current) return

      const channel = channelRef.current
      const user = currentUserRef.current

      // 1. Update local state immediately
      setFormData(prev => ({ ...prev, [field]: value }))

      // Track which field the current user is editing (for conflict detection)
      activeFieldRef.current = field

      // 2. Broadcast the change to other users
      channel.send({
        type: 'broadcast',
        event: 'field_update',
        payload: {
          field,
          value,
          userId: user.id,
          name: user.name,
        },
      })

      // 3. Update active field in presence
      channel.track({
        userId: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        activeField: field,
      })

      // 4. Clear activeField after 500ms debounce (signals "done editing")
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        activeFieldRef.current = null
        channel.track({
          userId: user.id,
          name: user.name,
          avatarUrl: user.avatarUrl,
          activeField: null,
        })
      }, 500)
    },
    [],
  )

  // ---- Conflict resolution ------------------------------------------------
  const resolveConflict = useCallback(
    (chosenValue: unknown) => {
      if (!conflict || !channelRef.current) return

      const channel = channelRef.current
      const user = currentUserRef.current

      setFormData(prev => ({ ...prev, [conflict.field]: chosenValue }))

      // Broadcast the resolved value so all peers converge
      channel.send({
        type: 'broadcast',
        event: 'field_update',
        payload: {
          field: conflict.field,
          value: chosenValue,
          userId: user.id,
          name: user.name,
        },
      })

      setConflict(null)
    },
    [conflict],
  )

  const dismissConflict = useCallback(() => {
    setConflict(null)
  }, [])

  // ---- Disabled state (no documentId) -------------------------------------
  const disabledReturn = useMemo<UseCollaborativeDocumentReturn>(
    () => ({
      formData: initialData,
      setField: NOOP as UseCollaborativeDocumentReturn['setField'],
      presence: EMPTY_PRESENCE,
      fieldLocks: EMPTY_LOCKS,
      conflict: null,
      resolveConflict: NOOP as UseCollaborativeDocumentReturn['resolveConflict'],
      dismissConflict: NOOP,
    }),
    [initialData],
  )

  if (!documentId) {
    return disabledReturn
  }

  return {
    formData,
    setField,
    presence,
    fieldLocks,
    conflict,
    resolveConflict,
    dismissConflict,
  }
}
