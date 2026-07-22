import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeGmailCode, getGoogleUserProfile } from '@/lib/email/oauth'
import { encrypt } from '@/lib/email/encryption'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    // Validate state against cookie
    const storedState = request.cookies.get('gmail_oauth_state')?.value

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?section=email&gmail=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?section=email&gmail=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
    const tokens = await exchangeGmailCode(code, redirectUri)

    // Fetch Google user profile
    const profile = await getGoogleUserProfile(tokens.access_token)

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const orgId = user.app_metadata.organization_id

    // Encrypt tokens before storage
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    // Upsert email connection
    const { error: upsertError } = await supabaseAdmin
      .from('email_connections')
      .upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          provider: 'gmail',
          email_address: profile.email,
          display_name: profile.name,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
          is_active: true,
        },
        { onConflict: 'organization_id,user_id,provider' },
      )

    if (upsertError) {
      console.error('Failed to upsert email_connections (gmail):', upsertError)
      return NextResponse.redirect(
        new URL('/settings?section=email&gmail=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      new URL('/settings?section=email&gmail=connected', process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('gmail_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/gmail',
    })

    return response
  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?section=email&gmail=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
