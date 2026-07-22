const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function wrapEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#18181b;padding:24px 32px;">
          <span style="color:#ffffff;font-size:18px;font-weight:700;">Agency Beats</span>
        </td></tr>
        <tr><td style="padding:32px;">
          <h2 style="margin:0 0 16px;font-size:18px;color:#18181b;">${title}</h2>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 32px;background:#f4f4f5;text-align:center;">
          <span style="color:#71717a;font-size:12px;">Sent by Agency Beats. Manage your notification preferences in Settings.</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function actionButton(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#ffffff;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:16px;">${label}</a>`
}

export function taskAssignedEmail(params: {
  taskTitle: string
  projectName: string
  assignedByName: string
  taskUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.taskUrl}`
  return {
    subject: `You've been assigned: ${params.taskTitle}`,
    html: wrapEmailHtml('New Task Assignment', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.assignedByName}</strong> assigned you to <strong>${params.taskTitle}</strong>
        in project <strong>${params.projectName}</strong>.
      </p>
      ${actionButton(url, 'View Task')}
    `),
  }
}

export function taskDueSoonEmail(params: {
  taskTitle: string
  projectName: string
  dueDate: string
  taskUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.taskUrl}`
  return {
    subject: `Due tomorrow: ${params.taskTitle}`,
    html: wrapEmailHtml('Task Due Tomorrow', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.taskTitle}</strong> in <strong>${params.projectName}</strong>
        is due on <strong>${params.dueDate}</strong>.
      </p>
      ${actionButton(url, 'View Task')}
    `),
  }
}

export function commentAddedEmail(params: {
  taskTitle: string
  commenterName: string
  commentPreview: string
  taskUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.taskUrl}`
  return {
    subject: `New comment on: ${params.taskTitle}`,
    html: wrapEmailHtml('New Comment', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.commenterName}</strong> commented on <strong>${params.taskTitle}</strong>:
      </p>
      <blockquote style="margin:12px 0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:4px;color:#52525b;font-size:14px;">
        ${params.commentPreview}
      </blockquote>
      ${actionButton(url, 'View Comment')}
    `),
  }
}

export function contentScheduledEmail(params: {
  taskTitle: string
  platform: string
  scheduledAt: string
  taskUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.taskUrl}`
  return {
    subject: `Content scheduled: ${params.taskTitle}`,
    html: wrapEmailHtml('Content Scheduled', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        Content for <strong>${params.taskTitle}</strong> (${params.platform})
        has been scheduled for <strong>${params.scheduledAt}</strong>.
      </p>
      ${actionButton(url, 'View Content')}
    `),
  }
}

export function contentPublishedEmail(params: {
  taskTitle: string
  platform: string
  taskUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.taskUrl}`
  return {
    subject: `Content published: ${params.taskTitle}`,
    html: wrapEmailHtml('Content Published', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        Content for <strong>${params.taskTitle}</strong> (${params.platform})
        has been published.
      </p>
      ${actionButton(url, 'View Content')}
    `),
  }
}

export function meetingStartingSoonEmail(params: {
  meetingTitle: string
  startTime: string
  meetingUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.meetingUrl}`
  return {
    subject: `Meeting starting soon: ${params.meetingTitle}`,
    html: wrapEmailHtml('Meeting Starting Soon', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.meetingTitle}</strong> is starting at <strong>${params.startTime}</strong>.
      </p>
      ${actionButton(url, 'Join Meeting')}
    `),
  }
}

export function meetingInviteEmail(params: {
  meetingTitle: string
  scheduledAt: string
  durationMinutes: number
  meetingUrl: string
  organizerName: string
  description?: string
}): { subject: string; html: string } {
  const dateStr = new Date(params.scheduledAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
  return {
    subject: `Meeting Invite: ${params.meetingTitle}`,
    html: wrapEmailHtml('Meeting Invitation', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0 0 12px;">
        <strong>${params.organizerName}</strong> has invited you to a meeting.
      </p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:13px;width:100px;">Meeting</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px;font-weight:500;">${params.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:13px;">When</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px;">${dateStr}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#71717a;font-size:13px;">Duration</td>
          <td style="padding:8px 0;color:#18181b;font-size:14px;">${params.durationMinutes} minutes</td>
        </tr>
      </table>
      ${params.description ? `<p style="color:#3f3f46;font-size:13px;line-height:1.5;margin:0 0 16px;padding:12px;background:#f4f4f5;border-radius:6px;">${params.description}</p>` : ''}
      <p style="color:#71717a;font-size:12px;margin:0 0 4px;">A calendar invite (.ics) is attached.</p>
      ${actionButton(params.meetingUrl, 'Join Meeting')}
    `),
  }
}

export function meetingSummaryEmail(params: {
  meetingTitle: string
  date: string
  duration: string
  summary: string
  actionItems: Array<{ task: string; assignee?: string }>
  transcriptUrl: string
}): { subject: string; html: string } {
  const actionItemsHtml = params.actionItems.length > 0
    ? `<ul style="padding-left:20px;margin:8px 0;">${params.actionItems.map((item) =>
      `<li style="color:#3f3f46;font-size:13px;line-height:1.6;margin:4px 0;">
        ${item.task}${item.assignee ? ` <span style="color:#71717a;">— ${item.assignee}</span>` : ''}
      </li>`
    ).join('')}</ul>`
    : '<p style="color:#71717a;font-size:13px;">No action items identified.</p>'

  return {
    subject: `Meeting Summary: ${params.meetingTitle}`,
    html: wrapEmailHtml('Meeting Summary', `
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px;">
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:13px;width:80px;">Meeting</td>
          <td style="padding:6px 0;color:#18181b;font-size:14px;font-weight:500;">${params.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:13px;">Date</td>
          <td style="padding:6px 0;color:#18181b;font-size:14px;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#71717a;font-size:13px;">Duration</td>
          <td style="padding:6px 0;color:#18181b;font-size:14px;">${params.duration}</td>
        </tr>
      </table>
      <h3 style="margin:16px 0 8px;font-size:15px;color:#18181b;">Summary</h3>
      <p style="color:#3f3f46;font-size:13px;line-height:1.6;margin:0 0 16px;">${params.summary}</p>
      <h3 style="margin:16px 0 8px;font-size:15px;color:#18181b;">Action Items</h3>
      ${actionItemsHtml}
      ${actionButton(params.transcriptUrl, 'View Full Transcript')}
    `),
  }
}

export function dmReceivedEmail(params: {
  senderName: string
  messagePreview: string
  chatUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.chatUrl}`
  return {
    subject: `New message from ${params.senderName}`,
    html: wrapEmailHtml('New Direct Message', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.senderName}</strong> sent you a direct message:
      </p>
      <blockquote style="margin:12px 0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:4px;color:#52525b;font-size:14px;">
        ${params.messagePreview}
      </blockquote>
      ${actionButton(url, 'View Message')}
    `),
  }
}

export function threadReplyEmail(params: {
  replierName: string
  messagePreview: string
  chatUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.chatUrl}`
  return {
    subject: `${params.replierName} replied to your message`,
    html: wrapEmailHtml('New Thread Reply', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.replierName}</strong> replied to your message:
      </p>
      <blockquote style="margin:12px 0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:4px;color:#52525b;font-size:14px;">
        ${params.messagePreview}
      </blockquote>
      ${actionButton(url, 'View Thread')}
    `),
  }
}

export function chatMentionEmail(params: {
  mentionedByName: string
  channelName: string
  messagePreview: string
  chatUrl: string
}): { subject: string; html: string } {
  const url = `${APP_URL}${params.chatUrl}`
  return {
    subject: `${params.mentionedByName} mentioned you in ${params.channelName}`,
    html: wrapEmailHtml('You were mentioned', `
      <p style="color:#3f3f46;font-size:14px;line-height:1.6;margin:0;">
        <strong>${params.mentionedByName}</strong> mentioned you in <strong>${params.channelName}</strong>:
      </p>
      <blockquote style="margin:12px 0;padding:12px 16px;background:#f4f4f5;border-left:3px solid #d4d4d8;border-radius:4px;color:#52525b;font-size:14px;">
        ${params.messagePreview}
      </blockquote>
      ${actionButton(url, 'View Message')}
    `),
  }
}
