import { create } from 'zustand'

interface KanbanStore {
  activeCardId: string | null
  setActiveCardId: (id: string | null) => void
  filterAssignee: string | null
  setFilterAssignee: (id: string | null) => void
  filterStatus: string | null
  setFilterStatus: (status: string | null) => void
}

export const useKanbanStore = create<KanbanStore>((set) => ({
  activeCardId: null,
  setActiveCardId: (id) => set({ activeCardId: id }),
  filterAssignee: null,
  setFilterAssignee: (id) => set({ filterAssignee: id }),
  filterStatus: null,
  setFilterStatus: (status) => set({ filterStatus: status }),
}))
