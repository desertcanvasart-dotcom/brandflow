import type { SocialProfile, SocialPublishRequest, SocialPublishResult } from '@/lib/social/types'

const LINKEDIN_API_BASE = 'https://api.linkedin.com/v2'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkedInTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  refresh_token_expires_in?: number
}

interface LinkedInRefreshTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
}

interface LinkedInUserInfo {
  sub: string
  name: string
  picture?: string
  email?: string
}

interface LinkedInOrganization {
  id: string
  name: string
  vanityName?: string
  logoUrl?: string
}

interface LinkedInImageUploadResponse {
  uploadUrl: string
  image: string
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

async function linkedinGet<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${LINKEDIN_API_BASE}${path}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `LinkedIn API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

async function linkedinPost<T>(path: string, body: unknown, accessToken: string, extraHeaders?: Record<string, string>): Promise<T> {
  const res = await fetch(`${LINKEDIN_API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `LinkedIn API error: ${res.status}`)
  }

  return res.json() as Promise<T>
}

async function linkedinRestPost<T>(path: string, body: unknown, accessToken: string): Promise<T> {
  const res = await fetch(`https://api.linkedin.com/rest${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'LinkedIn-Version': '202401',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `LinkedIn REST API error: ${res.status}`)
  }

  // Some LinkedIn REST endpoints return 201 with a header but no JSON body
  const text = await res.text()
  if (!text) {
    // Extract the activity URN from the x-restli-id header
    const restliId = res.headers.get('x-restli-id')
    return { id: restliId } as T
  }

  return JSON.parse(text) as T
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Build the LinkedIn OAuth 2.0 authorization URL.
 *
 * Redirects the user to LinkedIn's consent screen. The `state` param encodes
 * a CSRF token and the brand ID so the callback can associate the connection.
 */
export function getLinkedInAuthUrl(state: string, redirectUri: string, brandId: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    redirect_uri: redirectUri,
    scope: 'openid profile w_member_social r_organization_social w_organization_social',
    state: JSON.stringify({ csrf: state, brandId }),
  })

  return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
}

/**
 * Exchange an authorization code for access and refresh tokens.
 *
 * Called from the OAuth callback after the user authorizes the app.
 * Returns the full token payload including refresh token for long-lived access.
 */
export async function exchangeLinkedInCode(
  code: string,
  redirectUri: string,
): Promise<LinkedInTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(error.error_description ?? `LinkedIn token exchange error: ${res.status}`)
  }

  return res.json() as Promise<LinkedInTokenResponse>
}

/**
 * Refresh an expired access token using the refresh token.
 *
 * LinkedIn refresh tokens have a longer TTL than access tokens. Call this
 * before publishing when the current access token has expired.
 */
export async function refreshLinkedInToken(
  refreshToken: string,
): Promise<LinkedInRefreshTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  })

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(error.error_description ?? `LinkedIn token refresh error: ${res.status}`)
  }

  return res.json() as Promise<LinkedInRefreshTokenResponse>
}

/**
 * Fetch the authenticated user's profile via the OpenID Connect userinfo endpoint.
 *
 * Maps LinkedIn's `sub` claim to a `SocialProfile` so the caller gets a
 * consistent shape regardless of which social platform was queried.
 */
export async function getLinkedInProfile(accessToken: string): Promise<SocialProfile> {
  const userInfo = await linkedinGet<LinkedInUserInfo>('/userinfo', accessToken)

  return {
    id: userInfo.sub,
    name: userInfo.name,
    avatarUrl: userInfo.picture,
  }
}

/**
 * List the LinkedIn organizations (company pages) the authenticated user administrates.
 *
 * Uses the organizationAcls endpoint with a projection to inline the
 * organization details (name, vanity name, logo) in a single request.
 */
export async function getLinkedInOrganizations(
  accessToken: string,
): Promise<LinkedInOrganization[]> {
  const projection = '(elements*(organization~(id,localizedName,vanityName,logoV2(original~:playableStreams))))'
  const res = await linkedinGet<{
    elements: Array<{
      'organization~': {
        id: number
        localizedName: string
        vanityName?: string
        logoV2?: {
          'original~'?: {
            elements?: Array<{
              identifiers?: Array<{ identifier: string }>
            }>
          }
        }
      }
    }>
  }>(`/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=${projection}`, accessToken)

  return res.elements.map((el) => {
    const org = el['organization~']
    const logoStreams = org.logoV2?.['original~']?.elements
    const logoUrl = logoStreams?.[0]?.identifiers?.[0]?.identifier

    return {
      id: String(org.id),
      name: org.localizedName,
      vanityName: org.vanityName,
      logoUrl,
    }
  })
}

/**
 * Publish a post to a LinkedIn company page.
 *
 * Supports text-only and image posts. For image posts, each media URL is
 * first registered and uploaded via `registerLinkedInImageUpload` and
 * `uploadLinkedInImage`, then attached to the post body.
 *
 * Returns a `SocialPublishResult` with the post URL on success.
 */
export async function publishToLinkedIn(
  organizationUrn: string,
  accessToken: string,
  request: SocialPublishRequest,
): Promise<SocialPublishResult> {
  try {
    const orgId = organizationUrn.replace('urn:li:organization:', '')
    const author = `urn:li:organization:${orgId}`

    // Build commentary from text + hashtags
    let commentary = request.text
    if (request.hashtags?.length) {
      commentary += '\n\n' + request.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postBody: Record<string, any> = {
      author,
      commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
      },
      lifecycleState: 'PUBLISHED',
    }

    // Handle image posts
    if (request.mediaUrls?.length) {
      const imageUrns: string[] = []

      for (const mediaUrl of request.mediaUrls) {
        const upload = await registerLinkedInImageUpload(organizationUrn, accessToken)
        await uploadLinkedInImage(upload.uploadUrl, accessToken, mediaUrl)
        imageUrns.push(upload.image)
      }

      postBody.content = {
        multiImage: {
          images: imageUrns.map((urn) => ({ id: urn })),
        },
      }
    }

    const result = await linkedinRestPost<{ id?: string }>('/posts', postBody, accessToken)
    const activityUrn = result.id ?? ''

    return {
      success: true,
      platformPostId: activityUrn,
      platformPostUrl: activityUrn
        ? `https://linkedin.com/feed/update/${activityUrn}`
        : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown LinkedIn publish error',
    }
  }
}

/**
 * Register an image upload with LinkedIn's media API.
 *
 * This is the first step for attaching images to a post. LinkedIn returns an
 * `uploadUrl` (pre-signed PUT destination) and an `image` URN that is
 * referenced in the post body after the binary upload completes.
 */
export async function registerLinkedInImageUpload(
  organizationUrn: string,
  accessToken: string,
): Promise<LinkedInImageUploadResponse> {
  const orgId = organizationUrn.replace('urn:li:organization:', '')

  const res = await linkedinRestPost<{
    value: {
      uploadUrl: string
      image: string
    }
  }>('/images?action=initializeUpload', {
    initializeUploadRequest: {
      owner: `urn:li:organization:${orgId}`,
    },
  }, accessToken)

  return {
    uploadUrl: res.value.uploadUrl,
    image: res.value.image,
  }
}

/**
 * Upload an image binary to LinkedIn's pre-signed upload URL.
 *
 * Downloads the image from `imageUrl` (e.g. a Cloudflare R2 URL), then PUTs
 * the raw bytes to the `uploadUrl` returned by `registerLinkedInImageUpload`.
 */
export async function uploadLinkedInImage(
  uploadUrl: string,
  accessToken: string,
  imageUrl: string,
): Promise<void> {
  // Download the image from the source URL
  const imageRes = await fetch(imageUrl)
  if (!imageRes.ok) {
    throw new Error(`Failed to download image from ${imageUrl}: ${imageRes.status}`)
  }

  const imageBuffer = await imageRes.arrayBuffer()

  // Upload to LinkedIn's pre-signed URL
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream',
    },
    body: imageBuffer,
  })

  if (!uploadRes.ok) {
    throw new Error(`LinkedIn image upload failed: ${uploadRes.status}`)
  }
}
