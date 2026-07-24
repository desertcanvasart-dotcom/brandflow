import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  exchangeMetaCode,
  exchangeForLongLivedToken,
  getPages,
  getInstagramAccount,
} from '@/lib/social/meta'

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get('code')
    const state = request.nextUrl.searchParams.get('state')

    // Parse stored state from cookie
    const storedCookie = request.cookies.get('meta_oauth_state')?.value
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

    if (!state || !storedState || state !== storedState) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&meta=error&reason=state_mismatch', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&meta=error&reason=no_code', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    if (!brandId) {
      return NextResponse.redirect(
        new URL('/settings?section=social-media&meta=error&reason=no_brand', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    // Exchange code for short-lived token
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
    const shortTokenResponse = await exchangeMetaCode(code, redirectUri)

    // Upgrade to long-lived token
    const longTokenResponse = await exchangeForLongLivedToken(shortTokenResponse.access_token)
    const longLivedToken = longTokenResponse.access_token
    const expiresIn = longTokenResponse.expires_in

    // Fetch pages the user manages
    const pages = await getPages(longLivedToken)

    // Get the current authenticated user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.redirect(
        new URL('/login', process.env.NEXT_PUBLIC_APP_URL!),
      )
    }

    const orgId = user.app_metadata.organization_id

    // Fetch Facebook user profile for platform_user_id / platform_user_name
    const meRes = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${longLivedToken}`,
    )
    const meData = (await meRes.json()) as { id: string; name: string }
    const userId = meData.id
    const userName = meData.name

    if (pages.length === 0) {
      // No pages — redirect with error
      const response = NextResponse.redirect(
        new URL('/settings?section=social-media&meta=error&reason=no_pages', process.env.NEXT_PUBLIC_APP_URL!),
      )

      response.cookies.set('meta_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/api/auth/meta',
      })

      return response
    }

    if (pages.length === 1) {
      // Auto-select the single page
      const page = pages[0]

      // Check for Instagram business account
      const igAccount = page.accessToken
        ? await getInstagramAccount(page.id, page.accessToken)
        : null

      // Upsert Facebook connection
      const { error: fbUpsertError } = await supabaseAdmin
        .from('social_connections')
        .upsert(
          {
            organization_id: orgId,
            brand_id: brandId,
            platform: 'facebook',
            access_token: longLivedToken,
            token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
            platform_user_id: userId,
            platform_user_name: userName,
            platform_page_id: page.id,
            platform_page_name: page.name,
            page_access_token: page.accessToken,
            scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
            connected_by: user.id,
            metadata: { instagram_business_account_id: igAccount?.id ?? null },
            is_active: true,
          },
          { onConflict: 'brand_id,platform' },
        )

      if (fbUpsertError) {
        console.error('Failed to upsert Facebook social_connection:', fbUpsertError)
        return NextResponse.redirect(
          new URL('/settings?section=social-media&meta=error&reason=db_error', process.env.NEXT_PUBLIC_APP_URL!),
        )
      }

      // If Instagram business account is linked, upsert that too
      if (igAccount) {
        const { error: igUpsertError } = await supabaseAdmin
          .from('social_connections')
          .upsert(
            {
              organization_id: orgId,
              brand_id: brandId,
              platform: 'instagram',
              access_token: longLivedToken,
              token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
              platform_user_id: igAccount.id,
              platform_user_name: igAccount.username ?? igAccount.name ?? userName,
              platform_page_id: page.id,
              platform_page_name: page.name,
              page_access_token: page.accessToken,
              scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish'],
              connected_by: user.id,
              metadata: { facebook_page_id: page.id, instagram_business_account_id: igAccount.id },
              is_active: true,
            },
            { onConflict: 'brand_id,platform' },
          )

        if (igUpsertError) {
          console.error('Failed to upsert Instagram social_connection:', igUpsertError)
        }
      }

      // Clear state cookie and redirect
      const response = NextResponse.redirect(
        new URL('/settings?section=social-media&meta=connected', process.env.NEXT_PUBLIC_APP_URL!),
      )

      response.cookies.set('meta_oauth_state', '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/api/auth/meta',
      })

      return response
    }

    // Multiple pages — store data in cookie and send the user to the brand's
    // Social tab, where the page picker reads it back and completes the connect.
    const response = NextResponse.redirect(
      new URL(`/brands/${brandId}?tab=social&meta=select_page`, process.env.NEXT_PUBLIC_APP_URL!),
    )

    response.cookies.set('meta_pages_data', JSON.stringify({
      pages,
      userAccessToken: longLivedToken,
      longLivedToken,
      brandId,
      orgId,
      userId,
      userName,
      expiresIn,
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 600,
      path: '/api/auth/meta',
    })

    response.cookies.set('meta_oauth_state', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/meta',
    })

    return response
  } catch (error) {
    console.error('Meta OAuth callback error:', error)
    return NextResponse.redirect(
      new URL('/settings?section=social-media&meta=error', process.env.NEXT_PUBLIC_APP_URL!),
    )
  }
}
