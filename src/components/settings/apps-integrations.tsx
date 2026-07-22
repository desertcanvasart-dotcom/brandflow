'use client'

import { FigmaConnectButton } from '@/components/figma/figma-connect-button'
import { SlackIntegration } from '@/components/settings/slack-integration'

export function AppsIntegrations() {
  return (
    <div className="space-y-6">
      <FigmaConnectButton />
      <SlackIntegration />
    </div>
  )
}
