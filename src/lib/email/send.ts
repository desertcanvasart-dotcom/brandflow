import { resend } from './client'

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Agency Beats <noreply@agencybeats.app>'

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
  attachments?: Array<{ filename: string; content: Buffer | string }>
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments as any,
    })
  } catch (error) {
    console.error('[email] Failed to send:', error)
  }
}
