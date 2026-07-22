import { create } from 'zustand'

type SidebarTab = 'transcript' | 'participants' | 'chat' | 'ai' | 'notes'

interface MeetingStore {
  // Room & session identity
  roomId: string | null
  setRoomId: (id: string | null) => void
  sessionId: string | null
  setSessionId: (id: string | null) => void
  // Room state
  isInRoom: boolean
  setIsInRoom: (inRoom: boolean) => void
  isMuted: boolean
  setIsMuted: (muted: boolean) => void
  isCameraOff: boolean
  setIsCameraOff: (off: boolean) => void
  isScreenSharing: boolean
  setIsScreenSharing: (sharing: boolean) => void
  isRecording: boolean
  setIsRecording: (recording: boolean) => void
  // Notes
  notes: string
  setNotes: (notes: string) => void
  // Sidebar
  sidebarTab: SidebarTab
  setSidebarTab: (tab: SidebarTab) => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  // Reset
  reset: () => void
}

const initialState = {
  roomId: null as string | null,
  sessionId: null as string | null,
  isInRoom: false,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isRecording: false,
  notes: '',
  sidebarTab: 'transcript' as SidebarTab,
  isSidebarOpen: true,
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  ...initialState,
  setRoomId: (id) => set({ roomId: id }),
  setSessionId: (id) => set({ sessionId: id }),
  setIsInRoom: (inRoom) => set({ isInRoom: inRoom }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setIsCameraOff: (off) => set({ isCameraOff: off }),
  setIsScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setNotes: (notes) => set({ notes }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  reset: () => set(initialState),
}))
