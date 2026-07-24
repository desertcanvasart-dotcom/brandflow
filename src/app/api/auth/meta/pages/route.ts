import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getInstagramAccount } from '@/lib/social/meta'
import type { SocialPage } from '@/lib/social/types'

interface MetaPagesData {
  pages: SocialPage[]
  userAccessToken: string
  longLivedToken: string
  brandId: string
  orgId: string
  userId: string
  userName: string
  expiresIn: number
}

/**
 * GET — return the Pages awaiting selection, for the picker dialog.
 *
 * The page list is only available in the httpOnly `meta_pages_data` cookie the
 * OAuth callback set, so the client cannot read it directly. Only display
 * fields are returned here — never the access tokens held alongside them.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const pagesDataCookie = request.cookies.get('meta_pages_data')?.value

  if (!pagesDataCookie) {
    return NextResponse.json(
      { error: 'No page selection data found. Please restart the Meta connection flow.' },
      { status: 404 },
    )
  }

  let pagesData: MetaPagesData

  try {
    pagesData = JSON.parse(pagesDataCookie) as MetaPagesData
  } catch {
    return NextResponse.json({ error: 'Invalid page selection data' }, { status: 400 })
  }

  return NextResponse.json({
    brandId: pagesData.brandId,
    pages: pagesData.pages.map((page) => ({
      id: page.id,
      name: page.name,
      picture: page.avatarUrl,
    })),
  })
}

export async function POST(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read body
    const body = await request.json()
    const { brandId, pageId } = body as { brandId: string; pageId: string }

    if (!brandId || !pageId) {
      return NextResponse.json({ error: 'brandId and pageId are required' }, { status: 400 })
    }

    // Read and parse the meta_pages_data cookie
    const pagesDataCookie = request.cookies.get('meta_pages_data')?.value

    if (!pagesDataCookie) {
      return NextResponse.json({ error: 'No page selection data found. Please restart the Meta connection flow.' }, { status: 400 })
    }

    let pagesData: MetaPagesData

    try {
      pagesData = JSON.parse(pagesDataCookie) as MetaPagesData
    } catch {
      return NextResponse.json({ error: 'Invalid page selection data' }, { status: 400 })
    }

    // The cookie is the trusted record of which brand this OAuth run was for —
    // don't let a mismatched body attach the connection to a different brand.
    if (brandId !== pagesData.brandId) {
      return NextResponse.json(
        { error: 'Brand mismatch. Please restart the Meta connection flow.' },
        { status: 400 },
      )
    }

    // Find the selected page
    const page = pagesData.pages.find((p) => p.id === pageId)

    if (!page) {
      return NextResponse.json({ error: 'Selected page not found' }, { status: 404 })
    }

    const { longLivedToken, orgId, userId, userName, expiresIn } = pagesData

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
      return NextResponse.json({ error: 'Failed to save Facebook connection' }, { status: 500 })
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
        // Non-fatal: Facebook was saved, just log IG error
      }
    }

    // Clear the meta_pages_data cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set('meta_pages_data', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/meta',
    })

    return response
  } catch (error) {
    console.error('Meta page selection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete Meta connection' },
      { status: 500 },
    )
  }
}
