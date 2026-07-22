/**
 * Provider-agnostic email interfaces.
 * Gmail and Outlook implementations conform to these types.
 */

export interface ProviderMessage {
  messageId: string
  threadId: string
  from: { address: string; name?: string }
  to: { address: string; name?: string }[]
  cc?: { address: string; name?: string }[]
  bcc?: { address: string; name?: string }[]
  subject: string
  bodyHtml?: string
  bodyText?: string
  sentAt: string // ISO date
  isOutbound: boolean
  headers: {
    messageId?: string // Message-ID header
    inReplyTo?: string
    references?: string
  }
  attachments: ProviderAttachment[]
}

export interface ProviderAttachment {
  attachmentId: string
  fileName: string
  contentType: string
  sizeBytes: number
}

export interface ProviderThread {
  threadId: string
  subject: string
  snippet: string
  participants: string[] // email addresses
  lastMessageAt: string // ISO date
  messageCount: number
  isRead: boolean
  messages: ProviderMessage[]
}

export interface SendMessageParams {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  bodyHtml: string
  inReplyTo?: string // Message-ID for threading
  references?: string // References header
  threadId?: string // provider thread ID for reply
}

export interface SendMessageResult {
  messageId: string
  threadId: string
}

export interface WatchResult {
  resourceId: string
  expiry: string // ISO date
}

export interface FetchThreadsResult {
  threads: ProviderThread[]
  nextCursor?: string
}

export interface EmailProviderClient {
  /** Fetch threads, optionally filtered by contact emails. Returns paginated results. */
  fetchThreads(params: {
    cursor?: string
    contactEmails?: string[]
    maxResults?: number
    since?: string // ISO date
  }): Promise<FetchThreadsResult>

  /** Fetch all messages in a specific thread */
  fetchMessages(threadId: string): Promise<ProviderMessage[]>

  /** Send a new email or reply */
  sendMessage(params: SendMessageParams): Promise<SendMessageResult>

  /** Download an attachment by ID, returns the raw Buffer */
  downloadAttachment(messageId: string, attachmentId: string): Promise<Buffer>

  /** Set up push notifications (Gmail Watch / Graph Subscription) */
  setupWatch(webhookUrl: string): Promise<WatchResult>

  /** Stop push notifications */
  stopWatch(resourceId: string): Promise<void>

  /** Get changes since a cursor (Gmail historyId / Graph deltaLink) */
  getChanges(cursor: string): Promise<{
    threads: ProviderThread[]
    newCursor: string
  }>
}
