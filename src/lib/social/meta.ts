import type { SocialPublishRequest, SocialPublishResult, SocialPage } from '@/lib/social/types'

const META_GRAPH_BASE = 'https://graph.facebook.com/v19.0'
const META_OAUTH_BASE = 'https://www.facebook.com/v19.0/dialog/oauth'

// ---------------------------------------------------------------------------
// Types – Meta Graph API response shapes
// ---------------------------------------------------------------------------

interface MetaTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface MetaPageResponse {
  id: string
  name: string
  access_token: string
  picture?: { data?: { url?: string } }
}

interface MetaPagesResponse {
  data: MetaPageResponse[]
}

interface MetaInstagramBusinessAccount {
  id: string
  name?: string
  username?: string
  profile_picture_url?: string
}

interface MetaIGLookupResponse {
  instagram_business_account?: MetaInstagramBusinessAccount
}

interface MetaPostResponse {
  id: string
  post_id?: string
}

interface MetaMediaContainerResponse {
  id: string
}

interface MetaMediaPublishResponse {
  id: string
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function metaGet<T>(path: string, accessToken: string): Promise<T> {
  const separator = path.includes('?') ? '&' : '?'
  const url = `${META_GRAPH_BASE}${path}${separator}access_token=${accessToken}`

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(
      error.error?.message ?? `Meta API error: ${res.status}`,
    )
  }

  return res.json() as Promise<T>
}

async function metaPost<T>(path: string, body: Record<string, unknown>, accessToken: string): Promise<T> {
  const res = await fetch(`${META_GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(
      error.error?.message ?? `Meta API error: ${res.status}`,
    )
  }

  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// OAuth helpers
// ---------------------------------------------------------------------------

const SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  'instagram_basic',
  'instagram_content_publish',
].join(',')

/**
 * Build the Facebook OAuth authorization URL.
 *
 * The `brandId` is encoded into the `state` parameter as a JSON payload
 * alongside a CSRF token so the callback handler can associate the
 * connection with the correct brand.
 *
 * @param state   - CSRF token for security verification
 * @param redirectUri - OAuth callback URL
 * @param brandId - Brand to link this Meta connection to
 * @returns Full OAuth URL to redirect the user to
 */
export function getMetaAuthUrl(
  state: string,
  redirectUri: string,
  brandId: string,
): string {
  const encodedState = encodeURIComponent(
    JSON.stringify({ csrf: state, brandId }),
  )

  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: encodedState,
    response_type: 'code',
  })

  return `${META_OAUTH_BASE}?${params.toString()}`
}

// ---------------------------------------------------------------------------
// Token exchange
// ---------------------------------------------------------------------------

/**
 * Exchange an authorization code for a short-lived user access token.
 *
 * This is the second step of the OAuth flow — after the user authorizes
 * the app and Facebook redirects back with a `code`, call this to get
 * a usable access token.
 *
 * @param code        - Authorization code from the OAuth callback
 * @param redirectUri - Must match the redirect_uri used in the auth URL
 * @returns Short-lived token (typically valid for ~1-2 hours)
 */
export async function exchangeMetaCode(
  code: string,
  redirectUri: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
    { method: 'GET' },
  )

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(
      error.error?.message ?? `Meta token exchange failed: ${res.status}`,
    )
  }

  return res.json() as Promise<MetaTokenResponse>
}

/**
 * Upgrade a short-lived token to a long-lived token (~60 days).
 *
 * Should be called immediately after `exchangeMetaCode` to get a
 * durable token suitable for server-side storage and background
 * publishing.
 *
 * @param shortLivedToken - The short-lived token from exchangeMetaCode
 * @returns Long-lived token (valid for ~60 days)
 */
export async function exchangeForLongLivedToken(
  shortLivedToken: string,
): Promise<MetaTokenResponse> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortLivedToken,
  })

  const res = await fetch(
    `${META_GRAPH_BASE}/oauth/access_token?${params.toString()}`,
    { method: 'GET' },
  )

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }))
    throw new Error(
      error.error?.message ?? `Meta long-lived token exchange failed: ${res.status}`,
    )
  }

  return res.json() as Promise<MetaTokenResponse>
}

/**
 * Refresh a long-lived token before it expires.
 *
 * Meta uses the same fb_exchange_token endpoint to refresh long-lived
 * tokens. The token must still be valid (not fully expired) — if it
 * has already expired the user must re-authorize via the OAuth flow.
 *
 * @param token - The current long-lived token (must not be expired)
 * @returns New long-lived token with a refreshed expiry (~60 days)
 * @throws Error if the token is fully expired and cannot be refreshed
 */
export async function refreshLongLivedToken(
  token: string,
): Promise<MetaTokenResponse> {
  return exchangeForLongLivedToken(token)
}

// ---------------------------------------------------------------------------
// Pages & Instagram discovery
// ---------------------------------------------------------------------------

/**
 * List all Facebook Pages the authenticated user manages.
 *
 * Each page in the response includes its own page-level access token
 * which is used for publishing and reading page insights.
 *
 * @param userAccessToken - A valid user access token with pages_show_list scope
 * @returns Array of pages the user administers
 */
export async function getPages(
  userAccessToken: string,
): Promise<SocialPage[]> {
  const res = await metaGet<MetaPagesResponse>(
    '/me/accounts?fields=id,name,access_token,picture',
    userAccessToken,
  )

  return res.data.map((page) => ({
    id: page.id,
    name: page.name,
    accessToken: page.access_token,
    avatarUrl: page.picture?.data?.url ?? undefined,
  }))
}

/**
 * Discover the Instagram Business Account linked to a Facebook Page.
 *
 * Instagram publishing via the Graph API requires a business or creator
 * account that is connected to a Facebook Page. Returns `null` if no
 * Instagram account is linked.
 *
 * @param pageId           - The Facebook Page ID
 * @param pageAccessToken  - The page-level access token
 * @returns Instagram business account info, or null if not linked
 */
export async function getInstagramAccount(
  pageId: string,
  pageAccessToken: string,
): Promise<{
  id: string
  name: string | null
  username: string | null
  profilePictureUrl: string | null
} | null> {
  const res = await metaGet<MetaIGLookupResponse>(
    `/${pageId}?fields=instagram_business_account{id,name,username,profile_picture_url}`,
    pageAccessToken,
  )

  if (!res.instagram_business_account) {
    return null
  }

  const ig = res.instagram_business_account
  return {
    id: ig.id,
    name: ig.name ?? null,
    username: ig.username ?? null,
    profilePictureUrl: ig.profile_picture_url ?? null,
  }
}

// ---------------------------------------------------------------------------
// Publishing – Facebook
// ---------------------------------------------------------------------------

/**
 * Publish a post to a Facebook Page.
 *
 * Supports three post types:
 * - **Text-only**: Creates a text status update on the page timeline.
 * - **Single image**: Uploads a photo with an optional caption.
 * - **Link share**: Creates a post with a link preview.
 *
 * @param pageId           - The Facebook Page ID to publish to
 * @param pageAccessToken  - The page-level access token
 * @param request          - The content to publish (text, media, link)
 * @returns Result with the platform post ID and URL on success
 */
export async function publishToFacebook(
  pageId: string,
  pageAccessToken: string,
  request: SocialPublishRequest,
): Promise<SocialPublishResult> {
  try {
    const hasMedia = request.mediaUrls && request.mediaUrls.length > 0
    const hasLink = !!request.link

    let result: MetaPostResponse

    if (hasMedia) {
      // Single image post — POST /{pageId}/photos
      result = await metaPost<MetaPostResponse>(
        `/${pageId}/photos`,
        {
          url: request.mediaUrls![0],
          message: request.text,
        },
        pageAccessToken,
      )
    } else if (hasLink) {
      // Link share post — POST /{pageId}/feed
      result = await metaPost<MetaPostResponse>(
        `/${pageId}/feed`,
        {
          message: request.text,
          link: request.link,
        },
        pageAccessToken,
      )
    } else {
      // Text-only post — POST /{pageId}/feed
      result = await metaPost<MetaPostResponse>(
        `/${pageId}/feed`,
        {
          message: request.text,
        },
        pageAccessToken,
      )
    }

    const postId = result.post_id ?? result.id

    return {
      success: true,
      platformPostId: postId,
      platformPostUrl: `https://facebook.com/${postId}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to Facebook',
    }
  }
}

// ---------------------------------------------------------------------------
// Publishing – Instagram
// ---------------------------------------------------------------------------

/**
 * Publish a post to Instagram via the two-step container flow.
 *
 * Instagram publishing requires:
 * 1. **Create a media container** with the image URL and caption.
 * 2. **Publish the container** to make it visible on the profile.
 *
 * **Note:** Instagram does NOT support text-only posts — at least one
 * image is required. If no media is provided this function returns an
 * error result immediately.
 *
 * @param igUserId         - The Instagram Business Account ID
 * @param pageAccessToken  - The page-level access token (used for IG API too)
 * @param request          - The content to publish (must include at least one mediaUrl)
 * @returns Result with the platform post ID and URL on success
 */
export async function publishToInstagram(
  igUserId: string,
  pageAccessToken: string,
  request: SocialPublishRequest,
): Promise<SocialPublishResult> {
  try {
    // Instagram requires at least one image
    if (!request.mediaUrls || request.mediaUrls.length === 0) {
      return {
        success: false,
        error: 'Instagram requires at least one image — text-only posts are not supported',
        errorCode: 'MEDIA_REQUIRED',
      }
    }

    // Build caption from text + hashtags
    const hashtagString = request.hashtags && request.hashtags.length > 0
      ? '\n\n' + request.hashtags.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')
      : ''
    const caption = `${request.text}${hashtagString}`

    // Step 1: Create media container
    const container = await metaPost<MetaMediaContainerResponse>(
      `/${igUserId}/media`,
      {
        image_url: request.mediaUrls[0],
        caption,
      },
      pageAccessToken,
    )

    // Step 2: Publish the container
    const published = await metaPost<MetaMediaPublishResponse>(
      `/${igUserId}/media_publish`,
      {
        creation_id: container.id,
      },
      pageAccessToken,
    )

    return {
      success: true,
      platformPostId: published.id,
      platformPostUrl: `https://instagram.com/p/${published.id}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error publishing to Instagram',
    }
  }
}
