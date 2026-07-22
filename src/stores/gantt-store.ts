import { create } from 'zustand'
import type { GanttFilters } from '@/components/gantt/gantt-types'
import { DEFAULT_FILTERS } from '@/components/gantt/gantt-types'

interface GanttStore {
  // Collapse state
  collapsedBrands: Set<string>
  collapsedProjects: Set<string>
  toggleBrand: (brandId: string) => void
  toggleProject: (projectId: string) => void

  // Zoom
  zoomLevel: number
  setZoomLevel: (level: number) => void

  // Filters
  filters: GanttFilters
  setFilters: (filters: Partial<GanttFilters>) => void
  resetFilters: () => void
}

export const useGanttStore = create<GanttStore>((set) => ({
  collapsedBrands: new Set(),
  collapsedProjects: new Set(),
  toggleBrand: (brandId) =>
    set((state) => {
      const next = new Set(state.collapsedBrands)
      if (next.has(brandId)) next.delete(brandId)
      else next.add(brandId)
      return { collapsedBrands: next }
    }),
  toggleProject: (projectId) =>
    set((state) => {
      const next = new Set(state.collapsedProjects)
      if (next.has(projectId)) next.delete(projectId)
      else next.add(projectId)
      return { collapsedProjects: next }
    }),

  zoomLevel: 1,
  setZoomLevel: (level) => set({ zoomLevel: level }),

  filters: { ...DEFAULT_FILTERS },
  setFilters: (partial) =>
    set((state) => ({ filters: { ...state.filters, ...partial } })),
  resetFilters: () => set({ filters: { ...DEFAULT_FILTERS } }),
}))
