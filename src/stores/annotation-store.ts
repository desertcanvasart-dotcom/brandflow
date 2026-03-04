import { create } from 'zustand'

type AnnotationTool = 'pin' | 'rectangle' | 'arrow' | null

interface AnnotationStore {
  // Tool state
  activeTool: AnnotationTool
  setActiveTool: (tool: AnnotationTool) => void
  // Selection
  selectedAnnotationId: string | null
  setSelectedAnnotationId: (id: string | null) => void
  // Visibility
  showAnnotations: boolean
  setShowAnnotations: (show: boolean) => void
  toggleAnnotations: () => void
  // Version filter
  filterVersion: number | null
  setFilterVersion: (version: number | null) => void
  // Reset
  reset: () => void
}

export const useAnnotationStore = create<AnnotationStore>((set) => ({
  activeTool: null,
  setActiveTool: (tool) => set({ activeTool: tool }),
  selectedAnnotationId: null,
  setSelectedAnnotationId: (id) => set({ selectedAnnotationId: id }),
  showAnnotations: true,
  setShowAnnotations: (show) => set({ showAnnotations: show }),
  toggleAnnotations: () => set((state) => ({ showAnnotations: !state.showAnnotations })),
  filterVersion: null,
  setFilterVersion: (version) => set({ filterVersion: version }),
  reset: () =>
    set({
      activeTool: null,
      selectedAnnotationId: null,
      showAnnotations: true,
      filterVersion: null,
    }),
}))
