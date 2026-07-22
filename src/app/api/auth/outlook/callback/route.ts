import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeOutlookCode, getMicrosoftUserProfile } from '@/lib/email/oauth'
import { encrypt } from '@/lib/email/encryption'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    // Validate state against cookie
    const storedState = request.cookies.get('outlook_oauth_state')?.value

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?section=email&outlook=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?section=email&outlook=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/outlook/callback`
    const tokens = await exchangeOutlookCode(code, redirectUri)

    // Fetch Microsoft user profile
    const profile = await getMicrosoftUserProfile(tokens.access_token)

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
          provider: 'outlook',
          email_address: profile.email,
          display_name: profile.displayName,
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
      console.error('Failed to upsert email_connections (outlook):', upsertError)
      return NextResponse.redirect(
        new URL('/settings?section=email&outlook=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      new URL('/settings?section=email&outlook=connected', process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('outlook_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/outlook',
    })

    return response
  } catch (error) {
    console.error('Outlook OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?section=email&outlook=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
