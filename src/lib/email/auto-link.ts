/**
 * Auto-link email threads to projects by matching email participants
 * against brand_contacts.email.
 */
import { supabaseAdmin } from '@/lib/supabase/admin'

interface AutoLinkResult {
  projectId?: string
  brandId?: string
}

/**
 * Given an org and a list of email participants, attempt to find the
 * brand and active project that correspond to those contacts.
 *
 * Algorithm:
 * 1. Fetch all brand_contacts for the org that have an email matching any participant
 * 2. Get the brand_id(s) from the matching contacts
 * 3. Find the most recently active project for that brand
 */
export async function autoLinkThread(
  orgId: string,
  participants: string[],
): Promise<AutoLinkResult> {
  if (participants.length === 0) return {}

  // Normalise all participant addresses to lowercase
  const normalised = participants.map((p) => p.toLowerCase().trim())

  // Find brand contacts whose email matches any participant
  const { data: contacts, error } = await supabaseAdmin
    .from('brand_contacts')
    .select('brand_id, email, brands!inner(organization_id)')
    .in('email', normalised)

  if (error || !contacts || contacts.length === 0) return {}

  // Filter contacts to this org (brand_contacts doesn't have org_id directly)
  const orgContacts = contacts.filter(
    (c) => (c.brands as unknown as { organization_id: string })?.organization_id === orgId,
  )

  if (orgContacts.length === 0) return {}

  // Get unique brand IDs (pick the first match if multiple)
  const brandId = orgContacts[0].brand_id

  // Find the most recent active project for this brand
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('id')
    .eq('brand_id', brandId)
    .eq('organization_id', orgId)
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return {
    brandId,
    projectId: project?.id ?? undefined,
  }
}
