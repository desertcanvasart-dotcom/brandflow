/**
 * Factory to get the correct email provider client based on connection type.
 */
import type { EmailProviderClient } from './types'
import { GmailProvider } from './gmail'
import { OutlookProvider } from './outlook'
import { decrypt } from '../encryption'
import type { Database } from '@/types/database'

type EmailConnectionRow = Database['public']['Tables']['email_connections']['Row']

/**
 * Create a provider client from a stored email connection.
 * Automatically decrypts the access token.
 */
export function getEmailProvider(connection: EmailConnectionRow): EmailProviderClient {
  const accessToken = decrypt(connection.access_token)

  switch (connection.provider) {
    case 'gmail':
      return new GmailProvider(accessToken, connection.email_address)
    case 'outlook':
      return new OutlookProvider(accessToken, connection.email_address)
    default:
      throw new Error(`Unknown email provider: ${connection.provider}`)
  }
}
