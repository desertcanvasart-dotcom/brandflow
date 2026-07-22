import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeTwitterCode, getTwitterProfile } from '@/lib/social/twitter'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const stateParam = request.nextUrl.searchParams.get('state')

    // Parse stored state from cookie
    const storedCookie = request.cookies.get('twitter_oauth_state')?.value
    let storedState: string | undefined
    let brandId: string | undefined
    let codeVerifier: string | undefined

    if (storedCookie) {
      try {
        const parsed = JSON.parse(storedCookie)
        storedState = parsed.state
        brandId = parsed.brandId
        codeVerifier = parsed.codeVerifier
      } catch {
        // Invalid cookie JSON
      }
    }

    // Validate state — Twitter returns the full JSON state we sent
    // which is JSON.stringify({ csrf: state, brandId }), so parse it
    // and compare the csrf field against our stored state
    let parsedState: { csrf?: string; brandId?: string } = {}
    try {
      parsedState = JSON.parse(stateParam || '{}')
    } catch {
      // Invalid state JSON
    }

    if (!parsedState.csrf || !storedState || parsedState.csrf !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&twitter=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&twitter=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!brandId) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&twitter=error&reason=no_brand', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!codeVerifier) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&twitter=error&reason=no_verifier', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for tokens using PKCE code verifier
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/twitter/callback`
    const tokens = await exchangeTwitterCode(code, codeVerifier, redirectUri)

    // Fetch Twitter user profile
    const profile = await getTwitterProfile(tokens.access_token)

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const orgId = user.app_metadata.organization_id

    // Derive the @username from the profile URL (https://twitter.com/{username})
    const username = profile.url?.split('/').pop() || profile.name

    // Upsert social connection for this brand + twitter
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          organization_id: orgId,
          brand_id: brandId,
          platform: 'twitter',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          platform_user_id: profile.id,
          platform_user_name: profile.name,
          platform_page_id: profile.id,
          platform_page_name: `@${username}`,
          platform_page_url: profile.url,
          scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
          connected_by: user.id,
          is_active: true,
        },
        { onConflict: 'brand_id,platform' },
      )

    if (upsertError) {
      console.error('Failed to upsert Twitter social_connection:', upsertError)
      return NextResponse.redirect(
        new URL('/settings?section=social-media&twitter=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      new URL('/settings?section=social-media&twitter=connected', process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('twitter_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/twitter',
    })

    return response
  } catch (error) {
    console.error('Twitter OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?section=social-media&twitter=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
