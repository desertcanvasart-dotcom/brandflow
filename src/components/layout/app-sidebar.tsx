'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderKanban,
  Palette,
  Calendar,
  GanttChart,
  Users,
  Settings,
  Video,
  BarChart3,
  ListOrdered,
  CreditCard,
  Bot,
  BookOpen,
  Library,
  Shield,
  MessageCircle,
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
import { useCurrentUser } from '@/hooks/use-current-user'
import { SidebarUnreadBadge } from '@/components/chat/sidebar-unread-badge'
import { MessagesUnreadBadge } from '@/components/chat/messages-unread-badge'

const NAV_GROUPS = [
  {
    label: 'Work',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { title: 'Projects', href: '/projects', icon: FolderKanban },
      { title: 'Brands', href: '/brands', icon: Palette },
      { title: 'Calendar', href: '/calendar', icon: Calendar },
      { title: 'Queue', href: '/queue', icon: ListOrdered },
      { title: 'Meetings', href: '/meetings', icon: Video },
      { title: 'Messages', href: '/messages', icon: MessageCircle },
      { title: 'Timeline', href: '/timeline', icon: GanttChart },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { title: 'Analytics', href: '/analytics', icon: BarChart3 },
      { title: 'AI Agents', href: '/ai', icon: Bot },
      { title: 'Knowledge Base', href: '/knowledge-base', icon: BookOpen },
    ],
  },
  {
    label: 'Operations',
    items: [
      { title: 'Task Library', href: '/task-library', icon: Library },
      { title: 'Team', href: '/team', icon: Users },
      { title: 'Billing', href: '/billing', icon: CreditCard },
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { isSuperAdmin } = useCurrentUser()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img src="/logo.png" alt="Agency Beats" className="h-10 w-auto rounded" />
          <span className="font-semibold text-lg">Agency Beats</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(item.href)}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        {item.title === 'Projects' && <SidebarUnreadBadge />}
                        {item.title === 'Messages' && <MessagesUnreadBadge />}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname.startsWith('/super-admin')}>
                    <Link href="/super-admin">
                      <Shield className="h-4 w-4" />
                      <span>Super Admin</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <UserNav />
      </SidebarFooter>
    </Sidebar>
  )
}
