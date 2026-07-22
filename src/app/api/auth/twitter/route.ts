import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTwitterAuthUrl, generateCodeVerifier } from '@/lib/social/twitter'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const brandId = request.nextUrl.searchParams.get('brandId')

  if (!brandId) {
    return NextResponse.json({ error: 'brandId is required' }, { status: 400 })
  }

  // Generate CSRF state and PKCE code verifier
  const state = crypto.randomUUID()
  const codeVerifier = generateCodeVerifier()

  // Build auth URL (state is encoded as JSON with csrf + brandId inside getTwitterAuthUrl)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
  const authUrl = getTwitterAuthUrl(state, codeVerifier, redirectUri, brandId)

  // Store state + codeVerifier + brandId in cookie for validation in callback
  const response = NextResponse.redirect(authUrl)

  response.cookies.set('twitter_oauth_state', JSON.stringify({ state, brandId, codeVerifier }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/api/auth/twitter',
  })

  return response
}
