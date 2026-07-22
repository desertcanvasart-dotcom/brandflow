'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Shield,
  ArrowLeft,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { UserNav } from './user-nav'

const superAdminNavItems = [
  { title: 'Overview', href: '/super-admin', icon: LayoutDashboard },
  { title: 'Organizations', href: '/super-admin/organizations', icon: Building2 },
  { title: 'Subscriptions', href: '/super-admin/subscriptions', icon: CreditCard },
  { title: 'Platform Admins', href: '/super-admin/admins', icon: Shield },
]

export function SuperAdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/super-admin" className="flex items-center gap-2">
          <img src="/logo.png" alt="Agency Beats" className="h-10 w-auto rounded" />
          <div>
            <span className="font-semibold text-lg">Agency Beats</span>
            <span className="block text-xs text-muted-foreground">Super Admin</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {superAdminNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      item.href === '/super-admin'
                        ? pathname === '/super-admin'
                        : pathname.startsWith(item.href)
                    }
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span>Back to Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}
