import { resend } from './client'

const FROM_EMAIL = process.env.EMAIL_FROM ?? 'BrandFlow <noreply@brandflow.app>'

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
  } catch (error) {
    console.error('[email] Failed to send:', error)
  }
}
