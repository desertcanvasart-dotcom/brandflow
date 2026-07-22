import { NextRequest, NextResponse } from 'next/server'
import { trackEvent } from '@/lib/notifications/analytics'

// POST: track push click, general events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { notificationId, event, channel } = body

    if (!notificationId || !event || !channel) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    await trackEvent(notificationId, channel, event)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// GET: email open tracking pixel + click redirect
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  const event = searchParams.get('event')
  const redirect = searchParams.get('redirect')

  if (id && event) {
    // Fire-and-forget tracking
    trackEvent(id, 'email', event).catch(() => {})
  }

  if (event === 'clicked' && redirect) {
    // Redirect to the actual link
    return NextResponse.redirect(decodeURIComponent(redirect))
  }

  // Return 1x1 transparent pixel for open tracking
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )
  return new NextResponse(pixel, {
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
