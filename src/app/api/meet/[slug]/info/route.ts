import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data: room, error } = await supabaseAdmin
    .from('meeting_rooms')
    .select('id, slug, name, is_active, projects(id, name), organizations(name)')
    .eq('slug', slug)
    .single()

  if (error || !room) {
    return Response.json({ error: 'Room not found' }, { status: 404 })
  }

  return Response.json({
    roomName: room.name,
    projectName: (room as any).projects?.name ?? null,
    organizationName: (room as any).organizations?.name ?? null,
    isActive: room.is_active,
  })
}
