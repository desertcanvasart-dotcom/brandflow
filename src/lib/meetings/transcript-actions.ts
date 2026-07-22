import { SupabaseClient } from '@supabase/supabase-js'
import { logActivity } from '@/lib/activity/log'

interface AddToBriefParams {
  supabase: SupabaseClient
  orgId: string
  projectId: string
  content: string
  sourceSessionId?: string
  userId: string
}

/**
 * Adds content extracted from a transcript chat to the project's intake brief.
 * If no intake exists for the project, creates one with the content as notes.
 */
export async function addToBrief({
  supabase,
  orgId,
  projectId,
  content,
  sourceSessionId,
  userId,
}: AddToBriefParams): Promise<{ success: boolean; intakeId?: string; error?: string }> {
  try {
    // Check for existing intake for this project
    const { data: existingIntake } = await supabase
      .from('project_intakes')
      .select('id, notes')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const timestamp = new Date().toISOString()
    const sessionRef = sourceSessionId ? ` (from session ${sourceSessionId})` : ''
    const appendContent = `\n\n---\n**Added from transcript chat** — ${new Date(timestamp).toLocaleString()}${sessionRef}\n\n${content}`

    if (existingIntake) {
      // Append to existing intake notes
      const updatedNotes = (existingIntake.notes ?? '') + appendContent

      const { error } = await supabase
        .from('project_intakes')
        .update({ notes: updatedNotes, updated_at: timestamp })
        .eq('id', existingIntake.id)

      if (error) {
        console.error('[transcript-actions] Failed to update intake:', error.message)
        return { success: false, error: 'Failed to update brief' }
      }

      // Log the activity
      await logActivity({
        supabase,
        orgId,
        actorId: userId,
        action: 'brief_approved',
        entityType: 'project',
        entityId: existingIntake.id,
        metadata: { source: 'transcript_chat', sessionId: sourceSessionId, action: 'updated_intake' },
      })

      return { success: true, intakeId: existingIntake.id }
    } else {
      // Create a new intake with this content
      const { data: newIntake, error } = await supabase
        .from('project_intakes')
        .insert({
          organization_id: orgId,
          project_id: projectId,
          status: 'draft',
          notes: appendContent.trim(),
          created_by: userId,
        })
        .select('id')
        .single()

      if (error || !newIntake) {
        console.error('[transcript-actions] Failed to create intake:', error?.message)
        return { success: false, error: 'Failed to create brief' }
      }

      await logActivity({
        supabase,
        orgId,
        actorId: userId,
        action: 'brief_approved',
        entityType: 'project',
        entityId: newIntake.id,
        metadata: { source: 'transcript_chat', sessionId: sourceSessionId, action: 'created_intake' },
      })

      return { success: true, intakeId: newIntake.id }
    }
  } catch (err: any) {
    console.error('[transcript-actions] Error:', err.message)
    return { success: false, error: err.message }
  }
}
