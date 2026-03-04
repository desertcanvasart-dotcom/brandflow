'use client'

import { useCallback } from 'react'
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
  ControlBar,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react'
import '@livekit/components-styles'
import { Track } from 'livekit-client'
import { useMeetingStore } from '@/stores/meeting-store'

interface VideoRoomProps {
  token: string
  serverUrl: string
  onDisconnect?: () => void
}

export function VideoRoom({ token, serverUrl, onDisconnect }: VideoRoomProps) {
  const { setIsInRoom, reset } = useMeetingStore()

  const handleConnected = useCallback(() => {
    setIsInRoom(true)
  }, [setIsInRoom])

  const handleDisconnected = useCallback(() => {
    setIsInRoom(false)
    reset()
    onDisconnect?.()
  }, [setIsInRoom, reset, onDisconnect])

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect={true}
      onConnected={handleConnected}
      onDisconnected={handleDisconnected}
      data-lk-theme="default"
      className="h-full w-full"
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}

export function VideoTiles() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  )

  return (
    <GridLayout tracks={tracks} className="h-full w-full">
      <ParticipantTile />
    </GridLayout>
  )
}
