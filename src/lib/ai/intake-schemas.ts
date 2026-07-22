import { z } from 'zod'

// ── Intake Extraction Schema ────────────────────────────────

export const intakeExtractionSchema = z.object({
  client_name: z.string().nullable().describe('Client contact name'),
  company_name: z.string().nullable().describe('Company or business name'),
  industry: z.string().nullable().describe('Industry or vertical'),
  goals: z.array(z.string()).describe('List of client goals and objectives'),
  services_requested: z
    .array(
      z.enum([
        'website', 'seo', 'content', 'social', 'paid_ads',
        'email', 'branding', 'cro', 'analytics', 'strategy',
      ])
    )
    .describe('Services the client is requesting'),
  target_audience: z.object({
    description: z.string().nullable(),
    demographics: z.array(z.string()),
    locations: z.array(z.string()),
  }).describe('Target audience details'),
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string().nullable(),
      notes: z.string().nullable(),
    })
  ).describe('Known competitors'),
  budget_range: z.string().nullable().describe('Budget range discussed'),
  timeline: z.string().nullable().describe('Overall timeline expectation'),
  start_date: z.string().nullable().describe('Desired start date (ISO format or descriptive)'),
  pain_points: z.array(z.string()).describe('Current pain points or challenges'),
  existing_assets: z.array(
    z.object({
      type: z.string(),
      description: z.string(),
      url: z.string().nullable(),
    })
  ).describe('Existing assets the client has'),
  confidence: z.enum(['high', 'medium', 'low']).describe(
    'Confidence level in the extraction quality'
  ),
})

export type IntakeExtraction = z.infer<typeof intakeExtractionSchema>

// ── Per-Service Requirement Schemas ─────────────────────────

const websiteRequirementsSchema = z.object({
  project_goals: z.string().nullable(),
  sitemap_scope: z.string().nullable(),
  tech_stack: z.string().nullable(),
  cms_required: z.boolean(),
  mobile_priority: z.string().nullable(),
  existing_site_url: z.string().nullable(),
  redesign_or_new: z.string().nullable(),
  brand_assets_available: z.boolean(),
  integrations: z.array(z.string()),
  launch_deadline: z.string().nullable(),
})

const seoRequirementsSchema = z.object({
  target_keywords: z.array(z.string()),
  target_locations: z.array(z.string()),
  competitors_to_track: z.array(z.string()),
  current_site_url: z.string().nullable(),
  technical_access_needed: z.boolean(),
  content_production_included: z.boolean(),
  local_seo_required: z.boolean(),
  reporting_frequency: z.string().nullable(),
})

const contentRequirementsSchema = z.object({
  content_types: z.array(z.string()),
  monthly_volume: z.string().nullable(),
  target_audience: z.string().nullable(),
  primary_topics: z.array(z.string()),
  tone_of_voice: z.string().nullable(),
  seo_optimized: z.boolean(),
  client_provides_brief: z.boolean(),
  approval_rounds: z.string().nullable(),
})

const socialRequirementsSchema = z.object({
  platforms: z.array(z.string()),
  posts_per_month: z.string().nullable(),
  content_types: z.array(z.string()),
  community_management_included: z.boolean(),
  paid_boosting_included: z.boolean(),
  client_provides_media: z.boolean(),
  tone_of_voice: z.string().nullable(),
  competitor_accounts: z.array(z.string()),
})

const paidAdsRequirementsSchema = z.object({
  platforms: z.array(z.string()),
  monthly_ad_budget: z.string().nullable(),
  campaign_objectives: z.array(z.string()),
  target_audience: z.string().nullable(),
  target_locations: z.array(z.string()),
  landing_page_url: z.string().nullable(),
  existing_accounts: z.boolean(),
  conversion_tracking_setup: z.boolean(),
  creative_production_included: z.boolean(),
})

const emailRequirementsSchema = z.object({
  esp_platform: z.string().nullable(),
  list_size: z.string().nullable(),
  automation_flows_needed: z.array(z.string()),
  campaign_frequency: z.string().nullable(),
  segmentation_required: z.boolean(),
  template_design_included: z.boolean(),
  existing_account: z.boolean(),
})

const brandingRequirementsSchema = z.object({
  scope: z.string().nullable(),
  redesign_or_new: z.string().nullable(),
  existing_assets_available: z.boolean(),
  competitors_to_differentiate_from: z.array(z.string()),
  preferred_style: z.string().nullable(),
  colors_to_avoid: z.array(z.string()),
  logo_concepts_required: z.string().nullable(),
  revision_rounds: z.string().nullable(),
})

const croRequirementsSchema = z.object({
  site_url: z.string().nullable(),
  primary_conversion_goal: z.string().nullable(),
  current_conversion_rate: z.string().nullable(),
  analytics_access_available: z.boolean(),
  heatmap_tool: z.string().nullable(),
  ab_testing_tool: z.string().nullable(),
  pages_in_scope: z.array(z.string()),
})

const analyticsRequirementsSchema = z.object({
  platforms_in_use: z.array(z.string()),
  tracking_gaps_known: z.array(z.string()),
  dashboard_tool: z.string().nullable(),
  reporting_frequency: z.string().nullable(),
  kpis_to_track: z.array(z.string()),
  gtm_access_available: z.boolean(),
})

const strategyRequirementsSchema = z.object({
  engagement_type: z.string().nullable(),
  deliverables_expected: z.array(z.string()),
  primary_challenge: z.string().nullable(),
  current_marketing_activities: z.array(z.string()),
  decision_makers_involved: z.array(z.string()),
})

// Map service type to its requirements schema
export const requirementsSchemaByType = {
  website: websiteRequirementsSchema,
  seo: seoRequirementsSchema,
  content: contentRequirementsSchema,
  social: socialRequirementsSchema,
  paid_ads: paidAdsRequirementsSchema,
  email: emailRequirementsSchema,
  branding: brandingRequirementsSchema,
  cro: croRequirementsSchema,
  analytics: analyticsRequirementsSchema,
  strategy: strategyRequirementsSchema,
} as const

export type ServiceType = keyof typeof requirementsSchemaByType

// ── Service Brief Schema ────────────────────────────────────

export function getServiceBriefSchema(serviceType: ServiceType) {
  const requirementsSchema = requirementsSchemaByType[serviceType]
  return z.object({
    title: z.string().describe('Brief title'),
    overview: z.string().describe('Brief overview/summary'),
    objectives: z.array(
      z.object({
        objective: z.string(),
        priority: z.enum(['high', 'medium', 'low']),
      })
    ).describe('Key objectives'),
    deliverables: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        estimated_hours: z.number().nullable(),
      })
    ).describe('Expected deliverables'),
    timeline: z.object({
      estimated_duration: z.string().nullable(),
      milestones: z.array(
        z.object({
          name: z.string(),
          target_date: z.string().nullable(),
        })
      ),
    }).describe('Timeline and milestones'),
    requirements: requirementsSchema.describe('Service-type-specific requirements'),
    kpis: z.array(
      z.object({
        metric: z.string(),
        target: z.string().nullable(),
        measurement_method: z.string().nullable(),
      })
    ).describe('Key performance indicators'),
  })
}

export type ServiceBriefOutput = ReturnType<typeof getServiceBriefSchema> extends z.ZodType<infer T> ? T : never

// ── Task Generation Schema ─────────────────────────────────

export const taskGenerationResponseSchema = z.object({
  tasks: z.array(
    z.object({
      phase_name: z.string().describe('Phase this task belongs to'),
      task_name: z.string().describe('Name of the task'),
      type: z.string().describe('Task type (e.g. audit, design, development)'),
      estimated_hours: z.number().describe('Estimated hours for this task'),
      include: z.boolean().describe('Whether to include this task for the brief'),
      reason: z.string().describe('Why this task is included or excluded — reference specific brief fields'),
    })
  ),
})

export type TaskGenerationResponse = z.infer<typeof taskGenerationResponseSchema>
