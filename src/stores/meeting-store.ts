import { create } from 'zustand'

interface MeetingStore {
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
  // Sidebar
  sidebarTab: 'transcript' | 'participants' | 'chat' | 'ai'
  setSidebarTab: (tab: 'transcript' | 'participants' | 'chat' | 'ai') => void
  isSidebarOpen: boolean
  setIsSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  // Reset
  reset: () => void
}

const initialState = {
  isInRoom: false,
  isMuted: false,
  isCameraOff: false,
  isScreenSharing: false,
  isRecording: false,
  sidebarTab: 'transcript' as const,
  isSidebarOpen: true,
}

export const useMeetingStore = create<MeetingStore>((set) => ({
  ...initialState,
  setIsInRoom: (inRoom) => set({ isInRoom: inRoom }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setIsCameraOff: (off) => set({ isCameraOff: off }),
  setIsScreenSharing: (sharing) => set({ isScreenSharing: sharing }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  reset: () => set(initialState),
}))
