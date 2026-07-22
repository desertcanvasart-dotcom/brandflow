'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { useCurrentUser } from '@/hooks/use-current-user'
import {
  SettingsSidebar,
  type SettingsSection,
} from '@/components/settings/settings-sidebar'
import { GeneralSettings } from '@/components/settings/general-settings'
import { OrganizationSettings } from '@/components/settings/organization-settings'
import { AccountSettings } from '@/components/settings/account-settings'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { QuietHours } from '@/components/settings/quiet-hours'
import { AppsIntegrations } from '@/components/settings/apps-integrations'
import { WebhookIntegration } from '@/components/settings/webhook-integration'
import { AutoAssignmentRules } from '@/components/settings/auto-assignment-rules'
import { ApiKeysSettings } from '@/components/settings/api-keys-settings'
import { AuditLogSettings } from '@/components/settings/audit-log-settings'
import { EmailConnectionSettings } from '@/components/settings/email-connection-settings'
import { CalendarSettings } from '@/components/settings/calendar-settings'
import { SocialMediaSettings } from '@/components/settings/social-media-settings'

const SECTION_TITLES: Record<SettingsSection, string> = {
  general: 'General',
  organization: 'Organization',
  account: 'Account',
  notifications: 'Notification Preferences',
  'quiet-hours': 'Quiet Hours',
  email: 'Email Connections',
  calendar: 'Calendar',
  apps: 'Apps & Integrations',
  'social-media': 'Social Media',
  webhooks: 'Webhooks',
  'auto-assignment': 'Auto-Assignment Rules',
  'api-keys': 'API Keys',
  'audit-log': 'Audit Log',
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>}>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { role } = useCurrentUser()

  const initialSection = (searchParams.get('section') as SettingsSection) || 'general'
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialSection)

  const handleSectionChange = (section: SettingsSection) => {
    setActiveSection(section)
    const url = new URL(window.location.href)
    url.searchParams.set('section', section)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const isAdmin = role === 'admin'
  const isManager = role === 'manager' || isAdmin

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex gap-8 p-6 min-h-[calc(100vh-4rem)]">
        {/* Left sidebar */}
        <SettingsSidebar
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />

        {/* Right content area */}
        <div className="flex-1 min-w-0 max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight mb-6">
            {SECTION_TITLES[activeSection]}
          </h2>

          {activeSection === 'general' && <GeneralSettings />}
          {activeSection === 'organization' && isAdmin && <OrganizationSettings />}
          {activeSection === 'account' && <AccountSettings />}
          {activeSection === 'notifications' && <NotificationPreferences />}
          {activeSection === 'quiet-hours' && <QuietHours />}
          {activeSection === 'email' && <EmailConnectionSettings />}
          {activeSection === 'calendar' && <CalendarSettings />}
          {activeSection === 'apps' && isAdmin && <AppsIntegrations />}
          {activeSection === 'social-media' && isAdmin && <SocialMediaSettings />}
          {activeSection === 'webhooks' && isAdmin && <WebhookIntegration />}
          {activeSection === 'auto-assignment' && isManager && <AutoAssignmentRules />}
          {activeSection === 'api-keys' && isAdmin && <ApiKeysSettings />}
          {activeSection === 'audit-log' && isAdmin && <AuditLogSettings />}
        </div>
      </div>
    </>
  )
}
