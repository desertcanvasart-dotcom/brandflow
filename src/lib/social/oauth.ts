import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeForLongLivedToken, getPages } from '@/lib/social/meta'
import { refreshTwitterToken } from '@/lib/social/twitter'
import { refreshLinkedInToken } from '@/lib/social/linkedin'
import type { TokenRefreshResult } from '@/lib/social/types'

// ---------------------------------------------------------------------------
// Token expiry check
// ---------------------------------------------------------------------------

/**
 * Check if a token has expired or will expire within the given buffer period.
 * @param expiresAt  ISO timestamp of token expiry
 * @param bufferMs   Buffer in milliseconds (default 7 days for Meta, 5 min for others)
 */
export function isTokenExpired(expiresAt: string | null, bufferMs = 5 * 60 * 1000): boolean {
  if (!expiresAt) return false // No expiry = never expires (e.g., some page tokens)
  return new Date(expiresAt).getTime() - bufferMs <= Date.now()
}

/**
 * Check if a Meta token is near expiry (< 7 days remaining).
 * Meta tokens should be refreshed proactively since there's no silent recovery.
 */
export function isMetaTokenNearExpiry(expiresAt: string | null): boolean {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
  return isTokenExpired(expiresAt, SEVEN_DAYS_MS)
}

// ---------------------------------------------------------------------------
// Unified token refresh dispatcher
// ---------------------------------------------------------------------------

interface SocialConnection {
  id: string
  platform: string
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  page_access_token: string | null
  platform_page_id: string | null
  is_active: boolean
}

/**
 * Refresh a social connection's token based on its platform.
 *
 * - **Twitter**: Uses refresh_token to get new access_token (2h expiry)
 * - **LinkedIn**: Uses refresh_token to get new access_token (60d expiry)
 * - **Meta (Facebook/Instagram)**: Re-exchanges the long-lived user token to extend it.
 *   If the token is fully expired, marks the connection as inactive and returns null.
 *   After refreshing the user token, re-fetches page tokens from /me/accounts.
 *
 * On success, updates the social_connections row in the database.
 * Returns the new token data or null if refresh failed.
 */
export async function refreshConnectionToken(
  connection: SocialConnection,
): Promise<TokenRefreshResult | null> {
  try {
    const { platform, id: connectionId } = connection

    if (platform === 'twitter') {
      return await refreshTwitterConnection(connection)
    }

    if (platform === 'linkedin') {
      return await refreshLinkedInConnection(connection)
    }

    if (platform === 'facebook' || platform === 'instagram') {
      return await refreshMetaConnection(connection)
    }

    return null
  } catch (error) {
    console.error(`Failed to refresh ${connection.platform} token for connection ${connection.id}:`, error)

    // Mark connection as inactive on refresh failure
    await supabaseAdmin
      .from('social_connections' as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', connection.id)

    return null
  }
}

// ---------------------------------------------------------------------------
// Platform-specific refresh implementations
// ---------------------------------------------------------------------------

async function refreshTwitterConnection(
  connection: SocialConnection,
): Promise<TokenRefreshResult | null> {
  if (!connection.refresh_token) {
    console.error('Twitter connection has no refresh token')
    return null
  }

  const result = await refreshTwitterToken(connection.refresh_token)

  // Update DB with new tokens
  await supabaseAdmin
    .from('social_connections' as any)
    .update({
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? connection.refresh_token,
      token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
  }
}

async function refreshLinkedInConnection(
  connection: SocialConnection,
): Promise<TokenRefreshResult | null> {
  if (!connection.refresh_token) {
    console.error('LinkedIn connection has no refresh token')
    return null
  }

  const result = await refreshLinkedInToken(connection.refresh_token)

  await supabaseAdmin
    .from('social_connections' as any)
    .update({
      access_token: result.access_token,
      refresh_token: result.refresh_token ?? connection.refresh_token,
      token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return {
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    expiresIn: result.expires_in,
  }
}

/**
 * Meta token refresh is different from Twitter/LinkedIn:
 * - Long-lived user tokens expire after ~60 days
 * - They can be re-exchanged (extended) while still valid
 * - If fully expired, the user must re-authenticate (no silent refresh)
 * - After refreshing the user token, we must re-fetch page tokens
 */
async function refreshMetaConnection(
  connection: SocialConnection,
): Promise<TokenRefreshResult | null> {
  // If the token is fully expired (not just near-expiry), we can't refresh
  if (isTokenExpired(connection.token_expires_at, 0)) {
    console.error(
      `Meta token for connection ${connection.id} is fully expired. User must reconnect.`,
    )

    // Mark as inactive — UI will prompt user to reconnect
    await supabaseAdmin
      .from('social_connections' as any)
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', connection.id)

    return null
  }

  // Re-exchange the long-lived token for a new one (extends by ~60 days)
  const result = await exchangeForLongLivedToken(connection.access_token)

  // Re-fetch page tokens since they derive from the user token
  let pageAccessToken = connection.page_access_token
  if (connection.platform_page_id) {
    try {
      const pages = await getPages(result.access_token)
      const matchingPage = pages.find((p) => p.id === connection.platform_page_id)
      if (matchingPage?.accessToken) {
        pageAccessToken = matchingPage.accessToken
      }
    } catch (err) {
      console.warn('Failed to re-fetch Meta page tokens during refresh:', err)
    }
  }

  // Update DB
  await supabaseAdmin
    .from('social_connections' as any)
    .update({
      access_token: result.access_token,
      token_expires_at: new Date(Date.now() + result.expires_in * 1000).toISOString(),
      page_access_token: pageAccessToken,
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id)

  return {
    accessToken: result.access_token,
    expiresIn: result.expires_in,
    pageAccessToken: pageAccessToken ?? undefined,
  }
}
