import { supabaseAdmin } from '@/lib/supabase/admin'
import { streamText } from 'ai'
import { defaultModel } from '@/lib/ai/provider'
import { MEETING_SUMMARIZER_PROMPT } from '@/lib/ai/prompts'
import { triggerEmbedding } from '@/lib/ai/embedding-triggers'
import { createNotifications } from '@/lib/notifications/create'
import { sendEmail } from '@/lib/email/send'
import { meetingSummaryEmail } from '@/lib/email/templates'
import type { Database } from '@/types/database'

type SessionRow = Database['public']['Tables']['meeting_sessions']['Row']
type RoomRow = Database['public']['Tables']['meeting_rooms']['Row']
type ParticipantRow = Database['public']['Tables']['session_participants']['Row']

/**
 * Triggered after a meeting session ends (from LiveKit room_finished webhook).
 * Orchestrates: AI summary → embedding → notifications → email.
 */
export async function triggerPostMeetingAutomation(
  roomId: string,
  sessionId: string
): Promise<void> {
  try {
    console.log(`[post-meeting] Starting automation for session ${sessionId}`)

    // 1. Fetch session with room and participants
    const { data: session } = await supabaseAdmin
      .from('meeting_sessions')
      .select('*')
      .eq('id', sessionId)
      .single<SessionRow>()

    if (!session) {
      console.error(`[post-meeting] Session ${sessionId} not found`)
      return
    }

    const { data: room } = await supabaseAdmin
      .from('meeting_rooms')
      .select('id, organization_id, project_id, name')
      .eq('id', roomId)
      .single<Pick<RoomRow, 'id' | 'organization_id' | 'project_id' | 'name'>>()

    if (!room) {
      console.error(`[post-meeting] Room ${roomId} not found`)
      return
    }

    const orgId = room.organization_id

    // Fetch participants
    const { data: participants } = await supabaseAdmin
      .from('session_participants')
      .select('user_id, guest_name, guest_email')
      .eq('session_id', sessionId)
      .returns<Pick<ParticipantRow, 'user_id' | 'guest_name' | 'guest_email'>[]>()

    const participantList = participants ?? []
    const authenticatedUserIds = participantList
      .filter((p) => p.user_id)
      .map((p) => p.user_id as string)
    const guestEmails = participantList
      .filter((p) => p.guest_email)
      .map((p) => ({ name: p.guest_name ?? 'Guest', email: p.guest_email as string }))

    // 2. Generate AI summary if transcript is available
    const transcriptText = session.transcript_text
    let summary = session.summary
    let actionItems = session.action_items

    if (transcriptText && !summary) {
      try {
        console.log(`[post-meeting] Generating AI summary for session ${sessionId}`)

        const result = await streamText({
          model: defaultModel,
          system: MEETING_SUMMARIZER_PROMPT,
          prompt: transcriptText,
        })

        // Collect full text from the stream
        let fullText = ''
        for await (const chunk of result.textStream) {
          fullText += chunk
        }

        summary = fullText

        // Try to extract action items JSON
        const jsonMatch = fullText.match(/```json\s*\n([\s\S]*?)\n```/)
        if (jsonMatch) {
          try {
            actionItems = JSON.parse(jsonMatch[1])
          } catch {
            // JSON parsing failed, store raw
            actionItems = null
          }
        }

        // Save summary back to session
        await supabaseAdmin
          .from('meeting_sessions')
          .update({
            summary,
            action_items: actionItems,
          })
          .eq('id', sessionId)

        console.log(`[post-meeting] Summary saved for session ${sessionId}`)
      } catch (err) {
        console.error(`[post-meeting] Failed to generate summary:`, err)
      }
    }

    // 3. Embed transcript for RAG search
    if (transcriptText) {
      triggerEmbedding(
        orgId,
        'meeting_transcript',
        sessionId,
        transcriptText,
        {
          roomId,
          projectId: room.project_id,
          sessionTitle: session.title,
        }
      )
      console.log(`[post-meeting] Triggered embedding for session ${sessionId}`)
    }

    // 4. Send notifications to authenticated participants
    if (authenticatedUserIds.length > 0) {
      const sessionTitle = session.title || room.name || 'Meeting'
      const meetingDuration = session.duration_seconds
        ? `${Math.round(session.duration_seconds / 60)} minutes`
        : 'Unknown duration'

      // We need an actorId — use the first participant or a system user
      const actorId = authenticatedUserIds[0] ?? 'system'

      await createNotifications({
        supabase: supabaseAdmin as any,
        orgId,
        recipientUserIds: authenticatedUserIds,
        actorId,
        type: 'meeting_ended',
        title: `Meeting ended: ${sessionTitle}`,
        body: summary
          ? `${sessionTitle} (${meetingDuration}). Summary is now available.`
          : `${sessionTitle} has ended (${meetingDuration}).`,
        link: room.project_id
          ? `/projects/${room.project_id}/room`
          : undefined,
        metadata: {
          sessionId,
          roomId,
          roomName: room.name,
          duration: meetingDuration,
        },
      })
      console.log(`[post-meeting] Notifications sent for session ${sessionId}`)
    }

    // 5. Send summary email to all participants (including guests)
    if (summary) {
      const sessionTitle = session.title || room.name || 'Meeting'
      const meetingDate = session.started_at
        ? new Date(session.started_at).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Unknown date'
      const meetingDuration = session.duration_seconds
        ? `${Math.round(session.duration_seconds / 60)} minutes`
        : 'Unknown duration'

      // Format action items for email
      const formattedActions = Array.isArray(actionItems)
        ? actionItems.map((item: any) => ({
            task: item.task ?? item.description ?? 'Untitled',
            assignee: item.assignee ?? 'Unassigned',
            deadline: item.deadline ?? 'TBD',
          }))
        : []

      const transcriptUrl = room.project_id
        ? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/projects/${room.project_id}/room`
        : ''

      const emailContent = meetingSummaryEmail({
        meetingTitle: sessionTitle,
        date: meetingDate,
        duration: meetingDuration,
        summary,
        actionItems: formattedActions,
        transcriptUrl,
      })

      // Get emails for authenticated users
      const userEmails: { name: string; email: string }[] = []
      if (authenticatedUserIds.length > 0) {
        const { data: members } = await supabaseAdmin
          .from('organization_members')
          .select('user_id, display_name')
          .eq('organization_id', orgId)
          .in('user_id', authenticatedUserIds)

        if (members) {
          for (const member of members) {
            // Get the user's email from auth
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(member.user_id)
            if (userData?.user?.email) {
              userEmails.push({
                name: member.display_name ?? 'Team Member',
                email: userData.user.email,
              })
            }
          }
        }
      }

      // Send emails to all participants
      const allRecipients = [...userEmails, ...guestEmails]
      await Promise.allSettled(
        allRecipients.map((recipient) =>
          sendEmail({
            to: recipient.email,
            subject: emailContent.subject,
            html: emailContent.html,
          })
        )
      )

      console.log(`[post-meeting] Summary emails sent to ${allRecipients.length} recipients`)
    }

    console.log(`[post-meeting] Automation completed for session ${sessionId}`)
  } catch (err) {
    console.error(`[post-meeting] Automation failed for session ${sessionId}:`, err)
  }
}
