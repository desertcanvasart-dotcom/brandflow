'use client'

import { useState, useEffect, useCallback } from 'react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

interface MeetingNotesProps {
  sessionId: string
}

export function MeetingNotes({ sessionId }: MeetingNotesProps) {
  const { data: session } = trpc.meetingRoom.getSession.useQuery({ sessionId })
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const updateSession = trpc.meetingRoom.updateSession.useMutation({
    onSuccess: () => {
      setLastSaved(new Date())
      setSaving(false)
    },
    onError: (err) => {
      toast.error('Failed to save notes: ' + err.message)
      setSaving(false)
    },
  })

  // Initialize notes from session data
  useEffect(() => {
    if (session?.notes && !notes) {
      setNotes(session.notes)
    }
  }, [session?.notes]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save debounce
  const saveNotes = useCallback(
    (value: string) => {
      setSaving(true)
      updateSession.mutate({ sessionId, notes: value })
    },
    [sessionId, updateSession]
  )

  useEffect(() => {
    if (!notes) return

    const timeout = setTimeout(() => {
      saveNotes(notes)
    }, 1500)

    return () => clearTimeout(timeout)
  }, [notes]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Session Notes</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {saving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-3 w-3" />
              Saved
            </>
          ) : null}
        </div>
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Take notes during the meeting..."
        className="flex-1 w-full resize-none rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[200px]"
      />
    </div>
  )
}
