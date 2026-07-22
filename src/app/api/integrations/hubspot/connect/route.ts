import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Get org id from user's active membership
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) return new Response('No organization', { status: 400 })

  const clientId = process.env.HUBSPOT_CLIENT_ID
  if (!clientId) return new Response('HubSpot not configured', { status: 500 })

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/hubspot/callback`
  const state = Buffer.from(
    JSON.stringify({
      orgId: membership.organization_id,
      userId: user.id,
    })
  ).toString('base64url')

  const url = new URL('https://app.hubspot.com/oauth/authorize')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('scope', 'crm.objects.contacts.read')
  url.searchParams.set('state', state)

  return Response.redirect(url.toString())
}
