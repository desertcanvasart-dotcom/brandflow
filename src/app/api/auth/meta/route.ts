import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMetaAuthUrl } from '@/lib/social/meta'

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

  const state = crypto.randomUUID()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/meta/callback`
  const authUrl = getMetaAuthUrl(state, redirectUri, brandId)

  const response = NextResponse.redirect(authUrl)

  response.cookies.set('meta_oauth_state', JSON.stringify({ state, brandId }), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 600,
    path: '/api/auth/meta',
  })

  return response
}
