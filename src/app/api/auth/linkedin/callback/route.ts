import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  exchangeLinkedInCode,
  getLinkedInProfile,
  getLinkedInOrganizations,
} from '@/lib/social/linkedin'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    // Parse stored state from cookie
    const storedCookie = request.cookies.get('linkedin_oauth_state')?.value
    let storedState: string | undefined
    let brandId: string | undefined

    if (storedCookie) {
      try {
        const parsed = JSON.parse(storedCookie)
        storedState = parsed.state
        brandId = parsed.brandId
      } catch {
        // Invalid cookie JSON
      }
    }

    // The state param from LinkedIn is JSON.stringify({ csrf, brandId })
    let csrfFromState: string | undefined

    if (state) {
      try {
        const parsed = JSON.parse(state)
        csrfFromState = parsed.csrf
      } catch {
        // state might not be valid JSON
      }
    }

    if (!csrfFromState || !storedState || csrfFromState !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!brandId) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=error&reason=no_brand', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`
    const tokens = await exchangeLinkedInCode(code, redirectUri)

    // Fetch LinkedIn user profile
    const profile = await getLinkedInProfile(tokens.access_token)

    // Fetch LinkedIn organizations (company pages) the user administrates
    const organizations = await getLinkedInOrganizations(tokens.access_token)

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const orgId = user.app_metadata.organization_id
    const scopes = ['openid', 'profile', 'w_member_social', 'r_organization_social', 'w_organization_social']

    if (organizations.length === 1) {
      // Auto-select the single organization
      const org = organizations[0]

      const { error: upsertError } = await supabaseAdmin
        .from('social_connections')
        .upsert(
          {
            organization_id: orgId,
            brand_id: brandId,
            platform: 'linkedin',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            platform_user_id: profile.id,
            platform_user_name: profile.name,
            platform_page_id: org.id,
            platform_page_name: org.name,
            platform_page_url: `https://linkedin.com/company/${org.vanityName}`,
            scopes,
            connected_by: user.id,
            is_active: true,
          },
          { onConflict: 'brand_id,platform' },
        )

      if (upsertError) {
        console.error('Failed to upsert LinkedIn social_connection:', upsertError)
        return NextResponse.redirect(
          new URL('/settings?section=social-media&linkedin=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
        )
      }

      // Clear state cookie and redirect
      const response = NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=connected', process.env.NEXT_PUBLIC_APP_URL!),
      )

      response.cookies.set('linkedin_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/api/auth/linkedin',
      })

      return response
    }

    if (organizations.length > 1) {
      // Multiple organizations -- store data in cookie for org selection
      const response = NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=select_org', process.env.NEXT_PUBLIC_APP_URL!),
      )

      response.cookies.set('linkedin_orgs_data', JSON.stringify({
        organizations,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        brandId,
        orgId,
        userId: user.id,
        profileId: profile.id,
        profileName: profile.name,
      }), {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 600,
        path: '/api/auth/linkedin',
      })

      response.cookies.set('linkedin_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/api/auth/linkedin',
      })

      return response
    }

    // Zero organizations -- create connection for personal profile posting
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          organization_id: orgId,
          brand_id: brandId,
          platform: 'linkedin',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          platform_user_id: profile.id,
          platform_user_name: profile.name,
          platform_page_id: profile.id,
          platform_page_name: profile.name,
          scopes,
          connected_by: user.id,
          is_active: true,
        },
        { onConflict: 'brand_id,platform' },
      )

    if (upsertError) {
      console.error('Failed to upsert LinkedIn social_connection (personal):', upsertError)
      return NextResponse.redirect(
        new URL('/settings?section=social-media&linkedin=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Clear state cookie and redirect
    const response = NextResponse.redirect(
      new URL('/settings?section=social-media&linkedin=connected', process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('linkedin_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/linkedin',
    })

    return response
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?section=social-media&linkedin=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
