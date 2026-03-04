import { create } from 'zustand'

interface BrandContextStore {
  activeBrandId: string | null
  setActiveBrandId: (brandId: string | null) => void
}

export const useBrandContextStore = create<BrandContextStore>((set) => ({
  activeBrandId: null,
  setActiveBrandId: (brandId) => set({ activeBrandId: brandId }),
}))
