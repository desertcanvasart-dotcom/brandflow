import { createAnthropic } from '@ai-sdk/anthropic'

// Use APP_ANTHROPIC_KEY (which won't be shadowed by Claude Desktop's
// empty ANTHROPIC_API_KEY system env var), falling back to the standard name.
const apiKey = process.env.APP_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || ''

export const anthropic = createAnthropic({
  apiKey,
  baseURL: 'https://api.anthropic.com/v1',
})

export const defaultModel = anthropic('claude-sonnet-4-5-20250929')
