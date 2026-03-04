'use client'

import { useRealtimeInvalidation } from '@/hooks/use-realtime'
import { CommandPalette } from '@/components/shared/command-palette'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  useRealtimeInvalidation()

  return (
    <>
      {children}
      <CommandPalette />
    </>
  )
}
