import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGmailAuthUrl } from '@/lib/email/oauth'

export async function GET() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const state = crypto.randomUUID()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`
  const authUrl = getGmailAuthUrl(state, redirectUri)

  const response = NextResponse.redirect(authUrl)

  response.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 300,
    path: '/api/auth/gmail',
  })

  return response
}
