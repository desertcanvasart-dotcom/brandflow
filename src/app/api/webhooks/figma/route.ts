import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Verify webhook passcode
    if (body.passcode !== process.env.FIGMA_WEBHOOK_PASSCODE) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle PING event (Figma sends this to verify webhook)
    if (body.event_type === 'PING') {
      return NextResponse.json({ ok: true })
    }

    // Handle FILE_UPDATE event
    if (body.event_type === 'FILE_UPDATE') {
      const fileKey = body.file_key as string

      if (!fileKey) {
        return NextResponse.json({ error: 'Missing file_key' }, { status: 400 })
      }

      // Find deliverables linked to this Figma file
      const { data: deliverables, error: queryError } = await supabaseAdmin
        .from('deliverables')
        .select('id, metadata')
        .filter('metadata->>figma_file_key', 'eq', fileKey)

      if (queryError) {
        console.error('Failed to query deliverables:', queryError)
        return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
      }

      // Update each deliverable's metadata with the latest modified timestamp
      if (deliverables && deliverables.length > 0) {
        const updates = deliverables.map((deliverable) => {
          const updatedMetadata = {
            ...(deliverable.metadata as Record<string, unknown>),
            figma_last_modified: body.timestamp,
          }

          return supabaseAdmin
            .from('deliverables')
            .update({ metadata: updatedMetadata })
            .eq('id', deliverable.id)
        })

        await Promise.all(updates)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Figma webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
