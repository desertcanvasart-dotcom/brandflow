'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, MessageCircle } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/chat/conversation-list'
import { ChannelChatView } from '@/components/chat/channel-chat-view'
import { DmUserPicker } from '@/components/chat/dm-user-picker'

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="flex h-[calc(100vh-4rem)] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <MessagesContent />
    </Suspense>
  )
}

function MessagesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [dmPickerOpen, setDmPickerOpen] = useState(false)

  // Get active channel from URL search params
  const activeChannelId = searchParams.get('channel')

  // Get current user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null)
      setUserRole(data.user?.app_metadata?.user_role ?? null)
    })
  }, [])

  // Ensure general + announcement channels exist (lazy creation)
  trpc.chat.getOrCreateOrgChannel.useQuery({ type: 'general' })
  trpc.chat.getOrCreateOrgChannel.useQuery({ type: 'announcement' })

  // Fetch conversation list
  const { data: conversations, isLoading } = trpc.chat.getMyConversations.useQuery()

  // Find active conversation details
  const activeConversation = conversations?.find((c) => c.channel.id === activeChannelId)

  const handleSelectChannel = (channelId: string) => {
    router.push(`/messages?channel=${channelId}`)
  }

  const handleNewDmSelect = (channelId: string) => {
    router.push(`/messages?channel=${channelId}`)
  }

  // Compute display info for active conversation
  const channelDisplayName = activeConversation
    ? activeConversation.channel.type === 'direct'
      ? activeConversation.otherUser?.display_name ?? 'Direct Message'
      : activeConversation.channel.name
    : ''

  const isReadOnly =
    activeConversation?.channel.type === 'announcement' && userRole !== 'admin'

  if (currentUserId === null) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left: Conversation list */}
      <div className="w-80 shrink-0 border-r flex flex-col">
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ConversationList
            conversations={conversations ?? []}
            activeChannelId={activeChannelId}
            onSelect={handleSelectChannel}
            onNewDm={() => setDmPickerOpen(true)}
          />
        )}
      </div>

      {/* Right: Active conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannelId && activeConversation ? (
          <ChannelChatView
            channelId={activeChannelId}
            channelType={activeConversation.channel.type}
            channelName={channelDisplayName}
            currentUserId={currentUserId}
            isReadOnly={isReadOnly}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">Select a conversation to start messaging</p>
              <p className="text-xs mt-1">
                Or click the compose button to start a new conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* DM user picker dialog */}
      <DmUserPicker
        open={dmPickerOpen}
        onOpenChange={setDmPickerOpen}
        currentUserId={currentUserId}
        onSelect={handleNewDmSelect}
      />
    </div>
  )
}
