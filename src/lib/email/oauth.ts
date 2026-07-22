/**
 * OAuth helpers for Gmail and Outlook email connections.
 * Follows the same pattern as src/lib/figma/oauth.ts.
 */

// ─── Gmail OAuth ────────────────────────────────────────────────
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ')

export function getGmailAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export async function exchangeGmailCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(err.error_description ?? `Google token exchange failed: ${res.status}`)
  }

  return res.json()
}

export async function refreshGmailToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(err.error_description ?? `Google token refresh failed: ${res.status}`)
  }

  return res.json()
}

export async function getGoogleUserProfile(
  accessToken: string,
): Promise<{ email: string; name: string }> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch Google user profile')
  return res.json()
}

// ─── Outlook / Microsoft OAuth ──────────────────────────────────
const MS_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
const MS_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
const MS_PROFILE_URL = 'https://graph.microsoft.com/v1.0/me'
const MS_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID!
const MS_CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET!

const OUTLOOK_SCOPES = [
  'Mail.ReadWrite',
  'Mail.Send',
  'User.Read',
  'offline_access',
].join(' ')

export function getOutlookAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OUTLOOK_SCOPES,
    response_mode: 'query',
    state,
  })
  return `${MS_AUTH_URL}?${params.toString()}`
}

export async function exchangeOutlookCode(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
    scope: OUTLOOK_SCOPES,
  })

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(err.error_description ?? `Microsoft token exchange failed: ${res.status}`)
  }

  return res.json()
}

export async function refreshOutlookToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    client_secret: MS_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
    scope: OUTLOOK_SCOPES,
  })

  const res = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error_description: res.statusText }))
    throw new Error(err.error_description ?? `Microsoft token refresh failed: ${res.status}`)
  }

  return res.json()
}

export async function getMicrosoftUserProfile(
  accessToken: string,
): Promise<{ email: string; displayName: string }> {
  const res = await fetch(MS_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) throw new Error('Failed to fetch Microsoft user profile')
  const data = await res.json()
  return { email: data.mail ?? data.userPrincipalName, displayName: data.displayName }
}
