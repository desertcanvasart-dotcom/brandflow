import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { ImpersonationBanner } from '@/components/layout/impersonation-banner'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <ImpersonationBanner />
        <DashboardShell>
          {children}
        </DashboardShell>
      </SidebarInset>
    </SidebarProvider>
  )
}
