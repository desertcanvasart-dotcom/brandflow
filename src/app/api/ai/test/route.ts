import { generateText } from 'ai'
import { defaultModel } from '@/lib/ai/provider'

export const dynamic = 'force-dynamic'

export async function GET() {
  // provider.ts reads APP_ANTHROPIC_KEY first (Claude Desktop shadows ANTHROPIC_API_KEY)
  const apiKey = process.env.APP_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY || ''
  const hasKey = !!apiKey

  if (!hasKey) {
    return Response.json({ success: false, error: 'No API key found (checked APP_ANTHROPIC_KEY and ANTHROPIC_API_KEY)' })
  }

  try {
    const { text } = await generateText({
      model: defaultModel,
      prompt: 'Say "Hello, AI is working!" in exactly those words.',
      maxOutputTokens: 50,
    })

    return Response.json({ success: true, text, model: defaultModel.modelId })
  } catch (error) {
    console.error('[ai/test] FAILED:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 })
  }
}
