import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { exchangeFigmaCode } from '@/lib/figma/oauth'
import { getMe } from '@/lib/figma/client'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    // Validate state against cookie
    const storedState = request.cookies.get('figma_oauth_state')?.value

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?figma=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?figma=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/figma/callback`
    const tokens = await exchangeFigmaCode(code, redirectUri)

    // Fetch Figma user profile
    const figmaUser = await getMe(tokens.access_token)

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const orgId = user.app_metadata.organization_id

    // Upsert Figma connection
    const { error: upsertError } = await supabaseAdmin
      .from('figma_connections')
      .upsert(
        {
          organization_id: orgId,
          user_id: user.id,
          figma_user_id: figmaUser.id,
          figma_user_name: figmaUser.handle,
          figma_email: figmaUser.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
        },
        { onConflict: 'organization_id,user_id' },
      )

    if (upsertError) {
      console.error('Failed to upsert figma_connections:', upsertError)
      return NextResponse.redirect(
        new URL('/settings?figma=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Clear state cookie and redirect to settings
    const response = NextResponse.redirect(
      new URL('/settings?figma=connected', process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('figma_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/figma',
    })

    return response
  } catch (error) {
    console.error('Figma OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?figma=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
