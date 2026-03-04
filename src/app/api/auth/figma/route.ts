import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFigmaAuthUrl } from '@/lib/figma/oauth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = crypto.randomUUID()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/figma/callback`
  const authUrl = getFigmaAuthUrl(state, redirectUri)

  const response = NextResponse.redirect(authUrl)

  response.cookies.set('figma_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/api/auth/figma',
  })

  return response
}
