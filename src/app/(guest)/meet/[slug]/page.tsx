'use client'

import { use, useState, useEffect } from 'react'
import { GuestPreJoin } from '@/components/meetings/guest-pre-join'
import { VideoRoom } from '@/components/meetings/video-room'

interface RoomInfo {
  roomName: string
  projectName: string | null
  organizationName: string | null
  isActive: boolean
}

export default function GuestMeetingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRoomInfo() {
      try {
        const res = await fetch(`/api/meet/${slug}/info`)
        if (!res.ok) {
          setError('Meeting room not found')
          return
        }
        const data = await res.json()
        if (!data.isActive) {
          setError('This meeting room is currently inactive')
          return
        }
        setRoomInfo(data)
      } catch {
        setError('Failed to load meeting room')
      } finally {
        setLoading(false)
      }
    }
    fetchRoomInfo()
  }, [slug])

  const handleJoin = async (name: string, email?: string) => {
    try {
      const res = await fetch(`/api/meet/${slug}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to join')
      }
      const data = await res.json()
      setToken(data.token)
      setServerUrl(data.serverUrl)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading meeting room...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Unable to Join</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (token && serverUrl) {
    return (
      <div className="h-screen">
        <VideoRoom
          token={token}
          serverUrl={serverUrl}
          onDisconnect={() => {
            setToken(null)
            setServerUrl(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <GuestPreJoin
        roomName={roomInfo?.roomName ?? 'Meeting'}
        projectName={roomInfo?.projectName ?? undefined}
        organizationName={roomInfo?.organizationName ?? undefined}
        onJoin={handleJoin}
      />
    </div>
  )
}
