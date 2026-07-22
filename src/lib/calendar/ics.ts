import { createEvent, type EventAttributes, type DateArray } from 'ics'

function toDateArray(date: Date): DateArray {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ]
}

export function generateICSFile(params: {
  title: string
  description?: string
  startTime: Date
  durationMinutes: number
  meetingUrl: string
  organizerName: string
  organizerEmail: string
  attendeeEmails: string[]
}): string {
  const event: EventAttributes = {
    start: toDateArray(params.startTime),
    duration: { minutes: params.durationMinutes },
    title: params.title,
    description: params.description,
    url: params.meetingUrl,
    organizer: { name: params.organizerName, email: params.organizerEmail },
    attendees: params.attendeeEmails.map((email) => ({
      email,
      rsvp: true,
      partstat: 'NEEDS-ACTION' as const,
      role: 'REQ-PARTICIPANT' as const,
    })),
    status: 'CONFIRMED' as const,
    busyStatus: 'BUSY' as const,
    productId: 'Agency Beats',
  }

  const { value, error } = createEvent(event)
  if (error) {
    console.error('[ics] Error generating ICS file:', error)
    throw new Error('Failed to generate calendar file')
  }
  return value!
}
