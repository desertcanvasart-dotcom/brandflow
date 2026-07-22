import crypto from 'crypto'
import type { SocialProfile, SocialPublishRequest, SocialPublishResult } from '@/lib/social/types'

const TWITTER_API_BASE = 'https://api.twitter.com/2'
const TWITTER_UPLOAD_BASE = 'https://upload.twitter.com/1.1'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TwitterTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope: string
}

export interface TwitterRefreshResponse {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface TwitterUser {
  id: string
  name: string
  username: string
  profile_image_url?: string
}

export interface TwitterTweetResponse {
  data: {
    id: string
    text: string
  }
}

export interface TwitterMediaResponse {
  media_id_string: string
  media_id: number
  size: number
  expires_after_secs: number
  image?: {
    image_type: string
    w: number
    h: number
  }
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function twitterGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${TWITTER_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? error.title ?? `Twitter API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

async function twitterPost<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`${TWITTER_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(error.detail ?? error.title ?? `Twitter API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

function getBasicAuthHeader(): string {
  const clientId = process.env.TWITTER_CLIENT_ID!
  const clientSecret = process.env.TWITTER_CLIENT_SECRET!
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
}

// ---------------------------------------------------------------------------
// OAuth 2.0 + PKCE
// ---------------------------------------------------------------------------

/**
 * Generate a random PKCE code verifier (43-128 characters).
 * Uses `crypto.randomBytes(32)` base64url-encoded to produce a 43-char string.
 */
export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/**
 * Build the Twitter OAuth 2.0 authorization URL with PKCE.
 *
 * @param state - CSRF token for the OAuth flow
 * @param codeVerifier - PKCE code verifier (generate with `generateCodeVerifier()`)
 * @param redirectUri - The registered callback URL
 * @param brandId - Brand ID to include in the state payload
 * @returns The full authorization URL to redirect the user to
 */
export function getTwitterAuthUrl(
  state: string,
  codeVerifier: string,
  redirectUri: string,
  brandId: string,
): string {
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: JSON.stringify({ csrf: state, brandId }),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
}

/**
 * Exchange an authorization code for access and refresh tokens.
 *
 * @param code - The authorization code returned by Twitter
 * @param codeVerifier - The original PKCE code verifier used during authorization
 * @param redirectUri - The same redirect URI used in the authorization request
 * @returns Token response containing access_token, refresh_token, expires_in, etc.
 */
export async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<TwitterTokenResponse> {
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    client_id: process.env.TWITTER_CLIENT_ID!,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
  })

  const res = await fetch(`${TWITTER_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(error.error_description ?? `Twitter token exchange failed: ${res.status}`)
  }

  return res.json() as Promise<TwitterTokenResponse>
}

/**
 * Refresh an expired access token using a refresh token.
 * Twitter access tokens expire after ~2 hours.
 *
 * @param refreshToken - The refresh token from a previous token exchange or refresh
 * @returns New access_token, refresh_token, and expires_in
 */
export async function refreshTwitterToken(
  refreshToken: string,
): Promise<TwitterRefreshResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    client_id: process.env.TWITTER_CLIENT_ID!,
  })

  const res = await fetch(`${TWITTER_API_BASE}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(error.error_description ?? `Twitter token refresh failed: ${res.status}`)
  }

  return res.json() as Promise<TwitterRefreshResponse>
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's Twitter profile.
 *
 * @param accessToken - Valid OAuth 2.0 access token
 * @returns A normalized SocialProfile with the user's id, name, url, and avatar
 */
export async function getTwitterProfile(accessToken: string): Promise<SocialProfile> {
  const res = await twitterGet<{ data: TwitterUser }>(
    '/users/me?user.fields=profile_image_url,username,name',
    accessToken,
  )

  return {
    id: res.data.id,
    name: res.data.name,
    url: `https://twitter.com/${res.data.username}`,
    avatarUrl: res.data.profile_image_url,
  }
}

/**
 * Publish a tweet. Currently supports text-only tweets with optional hashtags.
 * If mediaUrls are provided and media has been uploaded via `uploadTwitterMedia`,
 * pass the resulting media_ids in the request body.
 *
 * @param accessToken - Valid OAuth 2.0 access token
 * @param request - The publish request containing text, hashtags, and optional mediaUrls
 * @returns A SocialPublishResult with the tweet ID and URL
 */
export async function publishTweet(
  accessToken: string,
  request: SocialPublishRequest,
): Promise<SocialPublishResult> {
  try {
    let text = request.text

    // Append hashtags to the tweet text
    if (request.hashtags && request.hashtags.length > 0) {
      const tags = request.hashtags
        .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
        .join(' ')
      text = `${text}\n\n${tags}`
    }

    // Append link if provided
    if (request.link) {
      text = `${text}\n\n${request.link}`
    }

    const body: Record<string, unknown> = { text }

    // Media IDs support structure (requires prior upload via uploadTwitterMedia)
    if (request.mediaUrls && request.mediaUrls.length > 0) {
      // mediaUrls at this stage should be pre-uploaded media_id_strings
      // The caller is responsible for uploading media first and replacing
      // mediaUrls with the returned media_id_strings before calling publishTweet,
      // or this can be extended to upload inline.
      // For now, we treat them as already-uploaded media IDs if they look like IDs.
      const mediaIds = request.mediaUrls.filter((url) => /^\d+$/.test(url))
      if (mediaIds.length > 0) {
        body.media = { media_ids: mediaIds }
      }
    }

    const res = await twitterPost<TwitterTweetResponse>('/tweets', body, accessToken)

    return {
      success: true,
      platformPostId: res.data.id,
      platformPostUrl: `https://twitter.com/i/web/status/${res.data.id}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to publish tweet',
    }
  }
}

/**
 * Upload media to Twitter for use in tweets.
 * Uses the v1.1 media upload endpoint. Downloads the image from the provided URL
 * and re-uploads it as multipart form data.
 *
 * @param accessToken - Valid OAuth 2.0 access token
 * @param mediaUrl - Public URL of the media file to download and upload
 * @returns The media_id_string to pass in a tweet's media.media_ids array
 */
export async function uploadTwitterMedia(
  accessToken: string,
  mediaUrl: string,
): Promise<string> {
  // Download the media file
  const mediaRes = await fetch(mediaUrl)
  if (!mediaRes.ok) {
    throw new Error(`Failed to download media from ${mediaUrl}: ${mediaRes.status}`)
  }

  const mediaBuffer = Buffer.from(await mediaRes.arrayBuffer())
  const contentType = mediaRes.headers.get('content-type') ?? 'application/octet-stream'

  // Build multipart form data
  const formData = new FormData()
  formData.append('media_data', mediaBuffer.toString('base64'))
  formData.append('media_category', contentType.startsWith('video/') ? 'tweet_video' : 'tweet_image')

  const uploadRes = await fetch(`${TWITTER_UPLOAD_BASE}/media/upload.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!uploadRes.ok) {
    const error = await uploadRes.json().catch(() => ({ error: uploadRes.statusText }))
    throw new Error(
      (error as { error?: string }).error ?? `Twitter media upload failed: ${uploadRes.status}`,
    )
  }

  const data = (await uploadRes.json()) as TwitterMediaResponse
  return data.media_id_string
}
