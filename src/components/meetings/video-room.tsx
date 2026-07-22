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
import { PanelRightOpen, PanelRightClose } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeetingStore } from '@/stores/meeting-store'
import { MeetingSidebar } from './meeting-sidebar'
import { cn } from '@/lib/utils'

interface VideoRoomProps {
  token: string
  serverUrl: string
  sessionId?: string
  roomId?: string
  projectId?: string
  onDisconnect?: () => void
  /** Render without sidebar (e.g. guest view) */
  minimal?: boolean
}

export function VideoRoom({
  token,
  serverUrl,
  sessionId,
  roomId,
  projectId,
  onDisconnect,
  minimal = false,
}: VideoRoomProps) {
  const { setIsInRoom, isSidebarOpen, toggleSidebar, reset } = useMeetingStore()

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
      <div className="flex h-full w-full">
        {/* Video area */}
        <div className={cn('flex-1 min-w-0 relative', !minimal && isSidebarOpen && 'mr-0')}>
          <VideoConference />

          {/* Sidebar toggle button (non-minimal mode) */}
          {!minimal && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm"
              onClick={toggleSidebar}
            >
              {isSidebarOpen ? (
                <PanelRightClose className="h-4 w-4" />
              ) : (
                <PanelRightOpen className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Sidebar */}
        {!minimal && isSidebarOpen && sessionId && (
          <div className="w-80 shrink-0 border-l bg-background">
            <MeetingSidebar sessionId={sessionId} />
          </div>
        )}
      </div>
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
