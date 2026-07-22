import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { TASK_GENERATION_SYSTEM_PROMPT, getTaskGenerationUserPrompt } from '@/lib/ai/prompts'
import { taskGenerationResponseSchema } from '@/lib/ai/intake-schemas'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { serviceType, briefFields, templates } = await req.json()

  if (!serviceType || !briefFields || !templates) {
    return Response.json(
      { error: 'serviceType, briefFields, and templates are required' },
      { status: 400 }
    )
  }

  const result = await generateObject({
    model: defaultModel,
    schema: taskGenerationResponseSchema,
    system: TASK_GENERATION_SYSTEM_PROMPT,
    prompt: getTaskGenerationUserPrompt(serviceType, briefFields, templates),
  })

  return Response.json(result.object)
}
