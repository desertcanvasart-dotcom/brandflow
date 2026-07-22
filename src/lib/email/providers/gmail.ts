/**
 * Gmail API implementation of EmailProviderClient.
 * Uses raw REST calls to Gmail API v1.
 */
import type {
  EmailProviderClient,
  FetchThreadsResult,
  ProviderMessage,
  ProviderAttachment,
  ProviderThread,
  SendMessageParams,
  SendMessageResult,
  WatchResult,
} from './types'

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailProvider implements EmailProviderClient {
  constructor(
    private accessToken: string,
    private emailAddress: string,
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${GMAIL_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      throw new Error(`Gmail API error: ${err.error?.message ?? res.statusText}`)
    }
    return res.json()
  }

  async fetchThreads(params: {
    cursor?: string
    contactEmails?: string[]
    maxResults?: number
    since?: string
  }): Promise<FetchThreadsResult> {
    // Build Gmail search query
    const queryParts: string[] = []
    if (params.contactEmails?.length) {
      const emailFilter = params.contactEmails.map((e) => `from:${e} OR to:${e}`).join(' OR ')
      queryParts.push(`(${emailFilter})`)
    }
    if (params.since) {
      const epochSeconds = Math.floor(new Date(params.since).getTime() / 1000)
      queryParts.push(`after:${epochSeconds}`)
    }

    const searchParams = new URLSearchParams({
      maxResults: String(params.maxResults ?? 20),
      ...(params.cursor ? { pageToken: params.cursor } : {}),
      ...(queryParts.length ? { q: queryParts.join(' ') } : {}),
    })

    const listRes = await this.request<{
      threads?: { id: string; snippet: string; historyId: string }[]
      nextPageToken?: string
    }>(`/threads?${searchParams}`)

    if (!listRes.threads?.length) {
      return { threads: [], nextCursor: undefined }
    }

    // Fetch full thread details in parallel (batches of 10)
    const threads: ProviderThread[] = []
    for (let i = 0; i < listRes.threads.length; i += 10) {
      const batch = listRes.threads.slice(i, i + 10)
      const results = await Promise.all(
        batch.map((t) => this.fetchThreadDetail(t.id))
      )
      threads.push(...results.filter((t): t is ProviderThread => t !== null))
    }

    return {
      threads,
      nextCursor: listRes.nextPageToken,
    }
  }

  private async fetchThreadDetail(threadId: string): Promise<ProviderThread | null> {
    try {
      const thread = await this.request<{
        id: string
        messages: GmailMessage[]
      }>(`/threads/${threadId}?format=full`)

      if (!thread.messages?.length) return null

      const messages = thread.messages.map((m) => this.parseMessage(m))
      const participants = new Set<string>()
      for (const msg of messages) {
        participants.add(msg.from.address)
        msg.to.forEach((r) => participants.add(r.address))
        msg.cc?.forEach((r) => participants.add(r.address))
      }

      const lastMessage = messages[messages.length - 1]

      return {
        threadId: thread.id,
        subject: messages[0].subject || '(no subject)',
        snippet: this.getHeader(thread.messages[thread.messages.length - 1], 'Subject') ?? '',
        participants: Array.from(participants),
        lastMessageAt: lastMessage.sentAt,
        messageCount: messages.length,
        isRead: !thread.messages.some((m) => m.labelIds?.includes('UNREAD')),
        messages,
      }
    } catch {
      return null
    }
  }

  async fetchMessages(threadId: string): Promise<ProviderMessage[]> {
    const thread = await this.request<{
      messages: GmailMessage[]
    }>(`/threads/${threadId}?format=full`)

    return (thread.messages ?? []).map((m) => this.parseMessage(m))
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const mimeLines: string[] = []

    // Headers
    mimeLines.push(`To: ${params.to.join(', ')}`)
    if (params.cc?.length) mimeLines.push(`Cc: ${params.cc.join(', ')}`)
    if (params.bcc?.length) mimeLines.push(`Bcc: ${params.bcc.join(', ')}`)
    mimeLines.push(`From: ${this.emailAddress}`)
    mimeLines.push(`Subject: ${params.subject}`)
    if (params.inReplyTo) mimeLines.push(`In-Reply-To: ${params.inReplyTo}`)
    if (params.references) mimeLines.push(`References: ${params.references}`)
    mimeLines.push('Content-Type: text/html; charset=utf-8')
    mimeLines.push('')
    mimeLines.push(params.bodyHtml)

    const raw = Buffer.from(mimeLines.join('\r\n')).toString('base64url')

    const endpoint = params.threadId
      ? `/messages/send`
      : `/messages/send`

    const body: Record<string, string> = { raw }
    if (params.threadId) body.threadId = params.threadId

    const result = await this.request<{ id: string; threadId: string }>(
      endpoint,
      { method: 'POST', body: JSON.stringify(body) },
    )

    return { messageId: result.id, threadId: result.threadId }
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    const result = await this.request<{ data: string }>(
      `/messages/${messageId}/attachments/${attachmentId}`,
    )
    return Buffer.from(result.data, 'base64url')
  }

  async setupWatch(webhookUrl: string): Promise<WatchResult> {
    // Gmail uses Pub/Sub for push — topicName must be pre-configured
    // The webhookUrl is the Pub/Sub push endpoint
    const result = await this.request<{ historyId: string; expiration: string }>(
      '/watch',
      {
        method: 'POST',
        body: JSON.stringify({
          topicName: process.env.GMAIL_PUBSUB_TOPIC,
          labelIds: ['INBOX'],
          labelFilterBehavior: 'INCLUDE',
        }),
      },
    )

    return {
      resourceId: result.historyId,
      expiry: new Date(Number(result.expiration)).toISOString(),
    }
  }

  async stopWatch(): Promise<void> {
    await this.request('/stop', { method: 'POST' })
  }

  async getChanges(cursor: string): Promise<{
    threads: ProviderThread[]
    newCursor: string
  }> {
    const history = await this.request<{
      history?: { messagesAdded?: { message: { id: string; threadId: string } }[] }[]
      historyId: string
    }>(`/history?startHistoryId=${cursor}&historyTypes=messageAdded`)

    // Collect unique thread IDs from new messages
    const threadIds = new Set<string>()
    for (const entry of history.history ?? []) {
      for (const added of entry.messagesAdded ?? []) {
        threadIds.add(added.message.threadId)
      }
    }

    // Fetch updated threads
    const threads: ProviderThread[] = []
    for (const threadId of threadIds) {
      const thread = await this.fetchThreadDetail(threadId)
      if (thread) threads.push(thread)
    }

    return { threads, newCursor: history.historyId }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private parseMessage(msg: GmailMessage): ProviderMessage {
    const from = this.parseAddress(this.getHeader(msg, 'From') ?? '')
    const to = this.parseAddressList(this.getHeader(msg, 'To') ?? '')
    const cc = this.parseAddressList(this.getHeader(msg, 'Cc') ?? '')

    return {
      messageId: msg.id,
      threadId: msg.threadId,
      from,
      to,
      cc: cc.length ? cc : undefined,
      subject: this.getHeader(msg, 'Subject') ?? '(no subject)',
      bodyHtml: this.getBody(msg, 'text/html'),
      bodyText: this.getBody(msg, 'text/plain'),
      sentAt: new Date(Number(msg.internalDate)).toISOString(),
      isOutbound: from.address.toLowerCase() === this.emailAddress.toLowerCase(),
      headers: {
        messageId: this.getHeader(msg, 'Message-ID') ?? undefined,
        inReplyTo: this.getHeader(msg, 'In-Reply-To') ?? undefined,
        references: this.getHeader(msg, 'References') ?? undefined,
      },
      attachments: this.getAttachments(msg),
    }
  }

  private getHeader(msg: GmailMessage, name: string): string | null {
    return msg.payload?.headers?.find(
      (h) => h.name.toLowerCase() === name.toLowerCase(),
    )?.value ?? null
  }

  private getBody(msg: GmailMessage, mimeType: string): string | undefined {
    const part = this.findPart(msg.payload, mimeType)
    if (part?.body?.data) {
      return Buffer.from(part.body.data, 'base64url').toString('utf8')
    }
    return undefined
  }

  private findPart(
    payload: GmailPayload | undefined,
    mimeType: string,
  ): GmailPayload | undefined {
    if (!payload) return undefined
    if (payload.mimeType === mimeType) return payload
    for (const part of payload.parts ?? []) {
      const found = this.findPart(part, mimeType)
      if (found) return found
    }
    return undefined
  }

  private getAttachments(msg: GmailMessage): ProviderAttachment[] {
    const attachments: ProviderAttachment[] = []
    this.collectAttachments(msg.payload, msg.id, attachments)
    return attachments
  }

  private collectAttachments(
    payload: GmailPayload | undefined,
    messageId: string,
    result: ProviderAttachment[],
  ): void {
    if (!payload) return
    if (payload.filename && payload.body?.attachmentId) {
      result.push({
        attachmentId: payload.body.attachmentId,
        fileName: payload.filename,
        contentType: payload.mimeType ?? 'application/octet-stream',
        sizeBytes: payload.body.size ?? 0,
      })
    }
    for (const part of payload.parts ?? []) {
      this.collectAttachments(part, messageId, result)
    }
  }

  private parseAddress(raw: string): { address: string; name?: string } {
    const match = raw.match(/^(.*?)\s*<(.+)>$/)
    if (match) {
      return { name: match[1].replace(/^["']|["']$/g, '').trim() || undefined, address: match[2] }
    }
    return { address: raw.trim() }
  }

  private parseAddressList(raw: string): { address: string; name?: string }[] {
    if (!raw.trim()) return []
    return raw.split(',').map((r) => this.parseAddress(r.trim()))
  }
}

// ── Gmail API types ──────────────────────────────────────────────
interface GmailMessage {
  id: string
  threadId: string
  labelIds?: string[]
  internalDate: string
  payload?: GmailPayload
}

interface GmailPayload {
  mimeType?: string
  filename?: string
  headers?: { name: string; value: string }[]
  body?: { data?: string; size?: number; attachmentId?: string }
  parts?: GmailPayload[]
}
