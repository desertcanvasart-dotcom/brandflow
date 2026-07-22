import type { ContentPlatform } from '@/types/enums'

// ---------------------------------------------------------------------------
// Publish request & result
// ---------------------------------------------------------------------------

export interface SocialPublishRequest {
  text: string
  mediaUrls?: string[]
  hashtags?: string[]
  link?: string
  platform: ContentPlatform
}

export interface SocialPublishResult {
  success: boolean
  platformPostId?: string
  platformPostUrl?: string
  error?: string
  errorCode?: string
}

// ---------------------------------------------------------------------------
// Profile & pages (returned during OAuth / connection)
// ---------------------------------------------------------------------------

export interface SocialProfile {
  id: string
  name: string
  url?: string
  avatarUrl?: string
}

export interface SocialPage {
  id: string
  name: string
  accessToken?: string
  instagramAccountId?: string
  url?: string
  avatarUrl?: string
}

// ---------------------------------------------------------------------------
// Token refresh result
// ---------------------------------------------------------------------------

export interface TokenRefreshResult {
  accessToken: string
  refreshToken?: string
  expiresIn?: number
  pageAccessToken?: string
}

// ---------------------------------------------------------------------------
// Supported social platforms (subset of ContentPlatform with API integrations)
// ---------------------------------------------------------------------------

export const SOCIAL_PLATFORMS = ['facebook', 'instagram', 'twitter', 'linkedin'] as const
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number]

export function isSocialPlatform(platform: string): platform is SocialPlatform {
  return SOCIAL_PLATFORMS.includes(platform as SocialPlatform)
}
