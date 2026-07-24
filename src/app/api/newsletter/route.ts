import { z } from 'zod/v4'
import { resend } from '@/lib/email/client'

const CONTACT_INBOX = 'hello@agencybeats.app'

const schema = z.object({
  email: z.string().email(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  const email = parsed.data.email

  try {
    await resend.emails.send({
      from: 'Agency Beats <noreply@agencybeats.app>',
      to: CONTACT_INBOX,
      replyTo: email,
      subject: 'Newsletter signup',
      // Email is echoed in a text-only body, so no HTML escaping is needed —
      // zod has already constrained it to a valid address.
      text: `New newsletter signup: ${email}`,
    })
  } catch {
    return Response.json(
      { error: 'Could not sign you up right now. Please try again later.' },
      { status: 502 }
    )
  }

  return Response.json({ success: true })
}
