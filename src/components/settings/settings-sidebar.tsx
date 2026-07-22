'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  Search,
  Building2,
  Settings2,
  User,
  Bell,
  Moon,
  Plug,
  Webhook,
  Share2,
  Zap,
  Shield,
  ScrollText,
  Key,
  Users,
  FolderTree,
  ExternalLink,
  Mail,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type SettingsSection =
  | 'general'
  | 'organization'
  | 'account'
  | 'notifications'
  | 'quiet-hours'
  | 'apps'
  | 'webhooks'
  | 'social-media'
  | 'auto-assignment'
  | 'email'
  | 'calendar'
  | 'api-keys'
  | 'audit-log'

interface NavItem {
  key: SettingsSection
  label: string
  icon: LucideIcon
  /** Minimum role required to see this item */
  minRole?: 'admin' | 'manager'
}

interface ExternalNavItem {
  label: string
  icon: LucideIcon
  href: string
  minRole?: 'admin' | 'manager'
}

interface NavGroup {
  title: string
  items: (NavItem | ExternalNavItem)[]
}

function isExternal(item: NavItem | ExternalNavItem): item is ExternalNavItem {
  return 'href' in item
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Workspace',
    items: [
      { key: 'general', label: 'General', icon: Settings2 },
      { key: 'organization', label: 'Organization', icon: Building2, minRole: 'admin' },
      { key: 'account', label: 'Account', icon: User },
    ],
  },
  {
    title: 'Users & Permissions',
    items: [
      { label: 'Team Members', icon: Users, href: '/team', minRole: 'manager' },
      { label: 'Departments', icon: FolderTree, href: '/team?tab=departments', minRole: 'manager' },
    ],
  },
  {
    title: 'Integrations',
    items: [
      { key: 'email', label: 'Email', icon: Mail },
      { key: 'calendar', label: 'Calendar', icon: CalendarDays },
      { key: 'apps', label: 'Apps', icon: Plug, minRole: 'admin' },
      { key: 'social-media', label: 'Social Media', icon: Share2, minRole: 'admin' },
      { key: 'webhooks', label: 'Webhooks', icon: Webhook, minRole: 'admin' },
    ],
  },
  {
    title: 'Notifications',
    items: [
      { key: 'notifications', label: 'Preferences', icon: Bell },
      { key: 'quiet-hours', label: 'Quiet Hours', icon: Moon },
    ],
  },
  {
    title: 'Automation',
    items: [
      { key: 'auto-assignment', label: 'Auto-Assignment', icon: Zap, minRole: 'manager' },
    ],
  },
  {
    title: 'Security',
    items: [
      { key: 'api-keys', label: 'API Keys', icon: Key, minRole: 'admin' },
      { key: 'audit-log', label: 'Audit Log', icon: ScrollText, minRole: 'admin' },
    ],
  },
]

interface SettingsSidebarProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

export type { SettingsSection }

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const { role } = useCurrentUser()
  const [search, setSearch] = useState('')

  const roleLevel = useMemo(() => {
    const levels: Record<string, number> = {
      admin: 50,
      manager: 40,
      creator: 30,
      developer: 25,
      viewer: 10,
      client: 5,
    }
    return levels[role ?? 'viewer'] ?? 10
  }, [role])

  const filteredGroups = useMemo(() => {
    const query = search.toLowerCase()

    return NAV_GROUPS.map((group) => {
      const filteredItems = group.items.filter((item) => {
        // Role check
        if (item.minRole) {
          const minLevel = item.minRole === 'admin' ? 50 : 40
          if (roleLevel < minLevel) return false
        }
        // Search check
        if (query && !item.label.toLowerCase().includes(query)) return false
        return true
      })
      return { ...group, items: filteredItems }
    }).filter((group) => group.items.length > 0)
  }, [search, roleLevel])

  return (
    <div className="w-56 shrink-0 space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Search settings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-sm"
        />
      </div>

      {/* Nav groups */}
      {filteredGroups.map((group) => (
        <div key={group.title}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              if (isExternal(item)) {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                  </Link>
                )
              }

              const Icon = item.icon
              const isActive = activeSection === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSectionChange(item.key)}
                  className={cn(
                    'flex items-center gap-2.5 w-full rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
