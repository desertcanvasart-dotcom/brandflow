import { generateObject } from 'ai'
import { createClient } from '@/lib/supabase/server'
import { defaultModel } from '@/lib/ai/provider'
import { getServiceBriefPrompt } from '@/lib/ai/prompts'
import { getServiceBriefSchema, type ServiceType } from '@/lib/ai/intake-schemas'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { intakeData, serviceType, projectContext } = await req.json()

  if (!intakeData || !serviceType) {
    return Response.json(
      { error: 'intakeData and serviceType are required' },
      { status: 400 }
    )
  }

  const schema = getServiceBriefSchema(serviceType as ServiceType)
  const systemPrompt = getServiceBriefPrompt(serviceType)

  const result = await generateObject({
    model: defaultModel,
    schema,
    system: systemPrompt,
    prompt: `Generate a service brief for "${serviceType}" based on this intake data:

${JSON.stringify(intakeData, null, 2)}

${projectContext ? `Project context:\n${JSON.stringify(projectContext, null, 2)}` : ''}`,
  })

  return Response.json(result.object)
}
