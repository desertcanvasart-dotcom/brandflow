import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { PersonaData } from '@/types/kb-forms'
import type { Database } from '@/types/database'

type HubspotConnectionRow = Database['public']['Tables']['hubspot_connections']['Row']

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { orgId } = await req.json()

  // Get HubSpot connection for this organization
  const { data: connection } = await supabaseAdmin
    .from('hubspot_connections')
    .select('*')
    .eq('organization_id', orgId)
    .single<HubspotConnectionRow>()

  if (!connection) {
    return Response.json({ error: 'HubSpot not connected' }, { status: 400 })
  }

  // Check token expiry and refresh if needed
  let accessToken = connection.access_token
  if (new Date(connection.expires_at) < new Date()) {
    const refreshResp = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        refresh_token: connection.refresh_token,
      }),
    })

    if (!refreshResp.ok) {
      return Response.json(
        { error: 'Failed to refresh HubSpot token' },
        { status: 401 }
      )
    }

    const refreshed = await refreshResp.json()
    accessToken = refreshed.access_token

    await supabaseAdmin
      .from('hubspot_connections')
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(
          Date.now() + refreshed.expires_in * 1000
        ).toISOString(),
      })
      .eq('id', connection.id)
  }

  // Fetch contacts with relevant properties from HubSpot CRM
  const contactsResp = await fetch(
    'https://api.hubapi.com/crm/v3/objects/contacts?limit=100&properties=firstname,lastname,jobtitle,email,hs_persona,company',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!contactsResp.ok) {
    return Response.json(
      { error: 'Failed to fetch HubSpot contacts' },
      { status: 500 }
    )
  }

  const { results } = await contactsResp.json()

  // Map HubSpot contacts to PersonaData format
  const personas: Array<
    Partial<PersonaData> & { _hubspotId: string; _email: string }
  > = []

  for (const contact of results) {
    const props = contact.properties || {}
    // Skip contacts that have no role/persona information
    if (!props.jobtitle && !props.hs_persona) continue

    personas.push({
      _hubspotId: contact.id,
      _email: props.email || '',
      personaName:
        [props.firstname, props.lastname].filter(Boolean).join(' ') ||
        'Unknown',
      role: props.jobtitle || '',
      demographics: props.company ? `Company: ${props.company}` : '',
      goals: [],
      painPoints: [],
      preferredChannels: [],
      behaviorNotes: '',
      quotes: [],
    })
  }

  return Response.json({ personas, totalContacts: results.length })
}
