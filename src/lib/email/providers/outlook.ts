/**
 * Microsoft Graph (Outlook) implementation of EmailProviderClient.
 * Uses raw REST calls to Microsoft Graph API v1.0.
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

const GRAPH_API = 'https://graph.microsoft.com/v1.0/me'

export class OutlookProvider implements EmailProviderClient {
  constructor(
    private accessToken: string,
    private emailAddress: string,
  ) {}

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${GRAPH_API}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } }))
      throw new Error(`Graph API error: ${err.error?.message ?? res.statusText}`)
    }
    return res.json()
  }

  async fetchThreads(params: {
    cursor?: string
    contactEmails?: string[]
    maxResults?: number
    since?: string
  }): Promise<FetchThreadsResult> {
    // Use cursor as deltaLink if available, otherwise build initial query
    if (params.cursor) {
      return this.fetchThreadsFromDelta(params.cursor)
    }

    const top = params.maxResults ?? 20
    let filter = ''

    if (params.since) {
      filter = `receivedDateTime ge ${params.since}`
    }
    if (params.contactEmails?.length) {
      const emailFilters = params.contactEmails
        .map((e) => `(from/emailAddress/address eq '${e}' or toRecipients/any(r: r/emailAddress/address eq '${e}'))`)
        .join(' or ')
      filter = filter ? `${filter} and (${emailFilters})` : emailFilters
    }

    const queryParams = new URLSearchParams({
      $top: String(top),
      $orderby: 'receivedDateTime desc',
      $select: 'id,conversationId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,internetMessageHeaders',
      ...(filter ? { $filter: filter } : {}),
    })

    const result = await this.request<{
      value: OutlookMessage[]
      '@odata.nextLink'?: string
    }>(`/messages?${queryParams}`)

    // Group messages by conversationId into threads
    const threadMap = new Map<string, OutlookMessage[]>()
    for (const msg of result.value) {
      const key = msg.conversationId
      if (!threadMap.has(key)) threadMap.set(key, [])
      threadMap.get(key)!.push(msg)
    }

    const threads: ProviderThread[] = []
    for (const [conversationId, messages] of threadMap) {
      threads.push(this.buildThread(conversationId, messages))
    }

    return {
      threads,
      nextCursor: result['@odata.nextLink'],
    }
  }

  private async fetchThreadsFromDelta(deltaLink: string): Promise<FetchThreadsResult> {
    const res = await fetch(deltaLink, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    })
    if (!res.ok) throw new Error(`Graph delta query failed: ${res.statusText}`)
    const result = await res.json()

    const threadMap = new Map<string, OutlookMessage[]>()
    for (const msg of result.value ?? []) {
      const key = msg.conversationId
      if (!threadMap.has(key)) threadMap.set(key, [])
      threadMap.get(key)!.push(msg)
    }

    const threads: ProviderThread[] = []
    for (const [conversationId, messages] of threadMap) {
      threads.push(this.buildThread(conversationId, messages))
    }

    return {
      threads,
      nextCursor: result['@odata.deltaLink'] ?? result['@odata.nextLink'],
    }
  }

  async fetchMessages(threadId: string): Promise<ProviderMessage[]> {
    const result = await this.request<{ value: OutlookMessage[] }>(
      `/messages?$filter=conversationId eq '${threadId}'&$orderby=receivedDateTime asc&$select=id,conversationId,subject,bodyPreview,from,toRecipients,ccRecipients,receivedDateTime,isRead,hasAttachments,body,internetMessageHeaders`,
    )
    return result.value.map((m) => this.parseMessage(m))
  }

  async sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
    const message: Record<string, unknown> = {
      subject: params.subject,
      body: {
        contentType: 'HTML',
        content: params.bodyHtml,
      },
      toRecipients: params.to.map((addr) => ({
        emailAddress: { address: addr },
      })),
    }

    if (params.cc?.length) {
      message.ccRecipients = params.cc.map((addr) => ({
        emailAddress: { address: addr },
      }))
    }

    if (params.inReplyTo) {
      // For replies, use the reply endpoint
      const replyResult = await this.request<{ id: string; conversationId: string }>(
        '/sendMail',
        {
          method: 'POST',
          body: JSON.stringify({ message, saveToSentItems: true }),
        },
      )
      return {
        messageId: replyResult?.id ?? 'sent',
        threadId: params.threadId ?? '',
      }
    }

    const result = await this.request<{ id: string; conversationId: string }>(
      '/sendMail',
      {
        method: 'POST',
        body: JSON.stringify({ message, saveToSentItems: true }),
      },
    )

    return {
      messageId: result?.id ?? 'sent',
      threadId: result?.conversationId ?? '',
    }
  }

  async downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer> {
    const result = await this.request<{ contentBytes: string }>(
      `/messages/${messageId}/attachments/${attachmentId}`,
    )
    return Buffer.from(result.contentBytes, 'base64')
  }

  async setupWatch(webhookUrl: string): Promise<WatchResult> {
    const expiry = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) // 3 days

    const result = await this.request<{ id: string; expirationDateTime: string }>(
      '/subscriptions'.replace(GRAPH_API, 'https://graph.microsoft.com/v1.0'),
      {
        method: 'POST',
        body: JSON.stringify({
          changeType: 'created',
          notificationUrl: webhookUrl,
          resource: 'me/mailFolders/Inbox/messages',
          expirationDateTime: expiry.toISOString(),
          clientState: process.env.GRAPH_WEBHOOK_SECRET ?? 'agency-beats-email',
        }),
      },
    )

    return {
      resourceId: result.id,
      expiry: result.expirationDateTime,
    }
  }

  async stopWatch(resourceId: string): Promise<void> {
    const url = `https://graph.microsoft.com/v1.0/subscriptions/${resourceId}`
    await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${this.accessToken}` },
    })
  }

  async getChanges(cursor: string): Promise<{
    threads: ProviderThread[]
    newCursor: string
  }> {
    const result = await this.fetchThreadsFromDelta(cursor)
    return {
      threads: result.threads,
      newCursor: result.nextCursor ?? cursor,
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private buildThread(conversationId: string, messages: OutlookMessage[]): ProviderThread {
    const sorted = messages.sort(
      (a, b) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime(),
    )
    const participants = new Set<string>()
    for (const msg of sorted) {
      if (msg.from?.emailAddress?.address) {
        participants.add(msg.from.emailAddress.address)
      }
      for (const r of msg.toRecipients ?? []) {
        if (r.emailAddress?.address) participants.add(r.emailAddress.address)
      }
    }

    const lastMsg = sorted[sorted.length - 1]

    return {
      threadId: conversationId,
      subject: sorted[0].subject ?? '(no subject)',
      snippet: lastMsg.bodyPreview ?? '',
      participants: Array.from(participants),
      lastMessageAt: lastMsg.receivedDateTime,
      messageCount: sorted.length,
      isRead: sorted.every((m) => m.isRead),
      messages: sorted.map((m) => this.parseMessage(m)),
    }
  }

  private parseMessage(msg: OutlookMessage): ProviderMessage {
    const fromAddr = msg.from?.emailAddress?.address ?? ''
    const fromName = msg.from?.emailAddress?.name

    return {
      messageId: msg.id,
      threadId: msg.conversationId,
      from: { address: fromAddr, name: fromName ?? undefined },
      to: (msg.toRecipients ?? []).map((r) => ({
        address: r.emailAddress?.address ?? '',
        name: r.emailAddress?.name ?? undefined,
      })),
      cc: (msg.ccRecipients ?? []).map((r) => ({
        address: r.emailAddress?.address ?? '',
        name: r.emailAddress?.name ?? undefined,
      })),
      subject: msg.subject ?? '(no subject)',
      bodyHtml: msg.body?.contentType === 'html' ? msg.body.content : undefined,
      bodyText: msg.body?.contentType === 'text' ? msg.body.content : undefined,
      sentAt: msg.receivedDateTime,
      isOutbound: fromAddr.toLowerCase() === this.emailAddress.toLowerCase(),
      headers: this.extractHeaders(msg.internetMessageHeaders),
      attachments: [], // Attachments fetched separately if hasAttachments
    }
  }

  private extractHeaders(
    headers?: { name: string; value: string }[],
  ): ProviderMessage['headers'] {
    if (!headers) return {}
    const find = (name: string) =>
      headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value
    return {
      messageId: find('Message-ID'),
      inReplyTo: find('In-Reply-To'),
      references: find('References'),
    }
  }
}

// ── Outlook API types ────────────────────────────────────────────
interface OutlookMessage {
  id: string
  conversationId: string
  subject: string | null
  bodyPreview: string | null
  body?: { contentType: string; content: string }
  from?: { emailAddress: { name?: string; address: string } }
  toRecipients?: { emailAddress: { name?: string; address: string } }[]
  ccRecipients?: { emailAddress: { name?: string; address: string } }[]
  receivedDateTime: string
  isRead: boolean
  hasAttachments: boolean
  internetMessageHeaders?: { name: string; value: string }[]
}
