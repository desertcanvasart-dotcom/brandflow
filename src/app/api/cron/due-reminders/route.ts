import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { taskDueSoonEmail } from '@/lib/email/templates'

export async function GET(request: NextRequest) {
  try {
    // --- Auth ---
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // --- Compute tomorrow's UTC date range ---
    const now = new Date()
    const tomorrowStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
    )
    const tomorrowEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        23,
        59,
        59,
        999
      )
    )

    // --- Fetch tasks due tomorrow that are not done/published and have an assignee ---
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, due_date, assignee_id, project_id, projects(id, name, organization_id)')
      .gte('due_date', tomorrowStart.toISOString())
      .lte('due_date', tomorrowEnd.toISOString())
      .not('status', 'in', '("done","published")')
      .not('assignee_id', 'is', null)

    if (tasksError) {
      console.error('[cron/due-reminders] Failed to fetch tasks:', tasksError)
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ processed: 0 })
    }

    let processed = 0

    for (const task of tasks) {
      const project = task.projects as unknown as {
        id: string
        name: string
        organization_id: string
      } | null

      if (!project) continue

      const assigneeId = task.assignee_id as string

      // --- Check notification preferences ---
      const { data: prefs } = await supabaseAdmin
        .from('notification_preferences')
        .select('in_app, email')
        .eq('user_id', assigneeId)
        .eq('event_type', 'due_date_approaching')
        .maybeSingle()

      const inAppEnabled = prefs?.in_app ?? true
      const emailEnabled = prefs?.email ?? true

      const taskUrl = `/projects/${task.project_id}?task=${task.id}`
      const dueDateFormatted = new Date(task.due_date as string).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })

      // --- In-app notification ---
      if (inAppEnabled) {
        const { error: notifError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: assigneeId,
            organization_id: project.organization_id,
            type: 'due_date_approaching',
            title: `Task "${task.title}" is due tomorrow`,
            body: `Your task in ${project.name} is due on ${dueDateFormatted}.`,
            link: taskUrl,
          })

        if (notifError) {
          console.error(
            `[cron/due-reminders] Failed to insert notification for task ${task.id}:`,
            notifError
          )
        }
      }

      // --- Email notification ---
      if (emailEnabled) {
        const { data: userData, error: userError } =
          await supabaseAdmin.auth.admin.getUserById(assigneeId)

        if (userError || !userData?.user?.email) {
          console.error(
            `[cron/due-reminders] Failed to get user email for ${assigneeId}:`,
            userError
          )
        } else {
          const { subject, html } = taskDueSoonEmail({
            taskTitle: task.title,
            projectName: project.name,
            dueDate: dueDateFormatted,
            taskUrl,
          })

          await sendEmail({
            to: userData.user.email,
            subject,
            html,
          })
        }
      }

      processed++
    }

    return NextResponse.json({ processed })
  } catch (error) {
    console.error('[cron/due-reminders] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
