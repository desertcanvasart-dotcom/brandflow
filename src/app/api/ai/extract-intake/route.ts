import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { INTAKE_EXTRACTION_PROMPT } from '@/lib/ai/prompts'
import { intakeExtractionSchema } from '@/lib/ai/intake-schemas'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { transcript, projectId } = await req.json()

  if (!transcript || !projectId) {
    return Response.json(
      { error: 'transcript and projectId are required' },
      { status: 400 }
    )
  }

  const result = await generateObject({
    model: defaultModel,
    schema: intakeExtractionSchema,
    system: INTAKE_EXTRACTION_PROMPT,
    prompt: `Extract intake data from the following meeting transcript:\n\n${transcript}`,
  })

  return Response.json(result.object)
}
