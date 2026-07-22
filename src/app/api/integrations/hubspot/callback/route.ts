import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')

  if (!code || !state) return new Response('Missing params', { status: 400 })

  // Decode state
  let orgId: string
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    orgId = decoded.orgId
    userId = decoded.userId
  } catch {
    return new Response('Invalid state', { status: 400 })
  }

  // Exchange code for tokens
  const tokenResp = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`,
      code,
    }),
  })

  if (!tokenResp.ok) {
    const err = await tokenResp.text()
    console.error('[hubspot] Token exchange failed:', err)
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/knowledge-base?hubspot=error`
    )
  }

  const tokens = await tokenResp.json()

  // Get portal ID from access token info
  const infoResp = await fetch(
    'https://api.hubapi.com/oauth/v1/access-tokens/' + tokens.access_token
  )
  const info = await infoResp.json()

  // Upsert connection (one per organization)
  await supabaseAdmin.from('hubspot_connections').upsert(
    {
      organization_id: orgId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString(),
      portal_id: String(info.hub_id || ''),
      connected_by: userId,
    },
    { onConflict: 'organization_id' }
  )

  return Response.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/knowledge-base?hubspot=connected`
  )
}
