import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { SuperAdminSidebar } from '@/components/layout/super-admin-sidebar'

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <SuperAdminSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
