import { z } from 'zod/v4'
import { resend } from '@/lib/email/client'

const CONTACT_INBOX = 'hello@agencybeats.app'

const schema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: z.string().email(),
  company: z.string().max(200).optional().default(''),
  subject: z.enum(['demo', 'sales', 'support', 'billing', 'partnership', 'other']),
  message: z.string().min(1).max(5000),
})

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Please check the form and try again.' }, { status: 400 })
  }

  const { firstName, lastName, email, company, subject, message } = parsed.data
  const name = [firstName, lastName].filter(Boolean).join(' ')

  try {
    await resend.emails.send({
      from: 'Agency Beats <noreply@agencybeats.app>',
      to: CONTACT_INBOX,
      replyTo: email,
      subject: `[${subject}] Contact form — ${name}`,
      html: `
        <h2>New contact form submission</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company) || '—'}</p>
        <p><strong>Topic:</strong> ${escapeHtml(subject)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `,
    })
  } catch {
    // Don't leak provider details to the browser.
    return Response.json(
      { error: `Could not send your message. Please email us at ${CONTACT_INBOX}.` },
      { status: 502 }
    )
  }

  return Response.json({ success: true })
}
