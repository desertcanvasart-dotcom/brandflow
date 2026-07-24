import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

interface LinkedInOrgsData {
  organizations: Array<{
    id: string
    name: string
    vanityName?: string
    logoUrl?: string
  }>
  accessToken: string
  refreshToken: string
  expiresIn: number
  brandId: string
  orgId: string
  userId: string
  profileId: string
  profileName: string
}

/**
 * GET — return the organizations awaiting selection, for the picker dialog.
 *
 * The list is only available in the httpOnly `linkedin_orgs_data` cookie the
 * OAuth callback set, so the client cannot read it directly. Only display
 * fields are returned here — never the tokens held alongside them.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const orgsDataCookie = request.cookies.get('linkedin_orgs_data')?.value

  if (!orgsDataCookie) {
    return NextResponse.json(
      { error: 'No organization selection data found. Please restart the LinkedIn connection flow.' },
      { status: 404 },
    )
  }

  let orgsData: LinkedInOrgsData

  try {
    orgsData = JSON.parse(orgsDataCookie) as LinkedInOrgsData
  } catch {
    return NextResponse.json({ error: 'Invalid organization selection data' }, { status: 400 })
  }

  return NextResponse.json({
    brandId: orgsData.brandId,
    organizations: orgsData.organizations.map((org) => ({
      id: org.id,
      name: org.name,
      logoUrl: org.logoUrl,
      vanityName: org.vanityName,
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
    const { brandId, organizationId } = body as { brandId: string; organizationId: string }

    if (!brandId || !organizationId) {
      return NextResponse.json({ error: 'brandId and organizationId are required' }, { status: 400 })
    }

    // Read and parse the linkedin_orgs_data cookie
    const orgsDataCookie = request.cookies.get('linkedin_orgs_data')?.value

    if (!orgsDataCookie) {
      return NextResponse.json({ error: 'No organization selection data found. Please restart the LinkedIn connection flow.' }, { status: 400 })
    }

    let orgsData: LinkedInOrgsData

    try {
      orgsData = JSON.parse(orgsDataCookie) as LinkedInOrgsData
    } catch {
      return NextResponse.json({ error: 'Invalid organization selection data' }, { status: 400 })
    }

    // The cookie is the trusted record of which brand this OAuth run was for —
    // don't let a mismatched body attach the connection to a different brand.
    if (brandId !== orgsData.brandId) {
      return NextResponse.json(
        { error: 'Brand mismatch. Please restart the LinkedIn connection flow.' },
        { status: 400 },
      )
    }

    // Find the selected organization
    const org = orgsData.organizations.find((o) => o.id === organizationId)

    if (!org) {
      return NextResponse.json({ error: 'Selected organization not found' }, { status: 404 })
    }

    const { accessToken, refreshToken, expiresIn, orgId, profileId, profileName } = orgsData
    const scopes = ['openid', 'profile', 'w_member_social', 'r_organization_social', 'w_organization_social']

    // Upsert LinkedIn connection
    const { error: upsertError } = await supabaseAdmin
      .from('social_connections')
      .upsert(
        {
          organization_id: orgId,
          brand_id: brandId,
          platform: 'linkedin',
          access_token: accessToken,
          refresh_token: refreshToken,
          token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
          platform_user_id: profileId,
          platform_user_name: profileName,
          platform_page_id: org.id,
          platform_page_name: org.name,
          platform_page_url: org.vanityName
            ? `https://linkedin.com/company/${org.vanityName}`
            : null,
          scopes,
          connected_by: user.id,
          is_active: true,
        },
        { onConflict: 'brand_id,platform' },
      )

    if (upsertError) {
      console.error('Failed to upsert LinkedIn social_connection:', upsertError)
      return NextResponse.json({ error: 'Failed to save LinkedIn connection' }, { status: 500 })
    }

    // Clear the linkedin_orgs_data cookie
    const response = NextResponse.json({ success: true })

    response.cookies.set('linkedin_orgs_data', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/api/auth/linkedin',
    })

    return response
  } catch (error) {
    console.error('LinkedIn organization selection error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete LinkedIn connection' },
      { status: 500 },
    )
  }
}
