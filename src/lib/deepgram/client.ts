import { createClient } from '@deepgram/sdk'

export const deepgramClient = createClient(process.env.DEEPGRAM_API_KEY ?? '')
