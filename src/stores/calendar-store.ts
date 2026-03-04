import { create } from 'zustand'

type CalendarView = 'month' | 'week'

interface CalendarStore {
  view: CalendarView
  setView: (view: CalendarView) => void
  currentDate: Date
  setCurrentDate: (date: Date) => void
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  view: 'month',
  setView: (view) => set({ view }),
  currentDate: new Date(),
  setCurrentDate: (date) => set({ currentDate: date }),
}))
