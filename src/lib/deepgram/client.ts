import { createClient } from '@deepgram/sdk'

// Lazy singleton: the SDK throws if constructed without a key, which broke
// `next build` page-data collection in environments without env vars.
let client: ReturnType<typeof createClient> | null = null

export function getDeepgramClient() {
  if (!client) {
    client = createClient(process.env.DEEPGRAM_API_KEY ?? '')
  }
  return client
}
