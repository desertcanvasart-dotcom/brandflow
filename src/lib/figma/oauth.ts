const FIGMA_AUTH_URL = 'https://www.figma.com/oauth'
const FIGMA_TOKEN_URL = 'https://api.figma.com/v1/oauth/token'

const FIGMA_CLIENT_ID = process.env.FIGMA_CLIENT_ID!
const FIGMA_CLIENT_SECRET = process.env.FIGMA_CLIENT_SECRET!

/**
 * Build the Figma OAuth authorization URL that the user should be redirected to.
 */
export function getFigmaAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: FIGMA_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'files:read',
    state,
    response_type: 'code',
  })

  return `${FIGMA_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 */
export async function exchangeFigmaCode(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    client_id: FIGMA_CLIENT_ID,
    client_secret: FIGMA_CLIENT_SECRET,
    redirect_uri: redirectUri,
    code,
    grant_type: 'authorization_code',
  })

  const res = await fetch(FIGMA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `Figma token exchange failed: ${res.status}`)
  }

  return res.json()
}

/**
 * Use a refresh token to obtain a new access token.
 */
export async function refreshFigmaToken(
  refreshToken: string,
): Promise<{
  access_token: string
  expires_in: number
}> {
  const body = new URLSearchParams({
    client_id: FIGMA_CLIENT_ID,
    client_secret: FIGMA_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(FIGMA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? `Figma token refresh failed: ${res.status}`)
  }

  return res.json()
}
