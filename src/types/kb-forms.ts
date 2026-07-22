// Structured data interfaces for Knowledge Base custom forms
// Each corresponds to a content_type discriminator in knowledge_base_documents

export interface PersonaData {
  personaName: string
  role: string
  demographics: string
  goals: string[]
  painPoints: string[]
  preferredChannels: string[]
  behaviorNotes: string
  quotes: string[]
}

export interface StrategyData {
  objectiveType: 'awareness' | 'engagement' | 'conversion' | 'retention'
  targetAudience: string
  channels: string[]
  keyMessages: string[]
  kpis: string[]
  timeline: string
  budget: string
  competitivePosition: string
}

export interface CompetitorData {
  companyName: string
  website: string
  industry: string
  strengths: string[]
  weaknesses: string[]
  channels: string[]
  positioning: string
  priceRange: string
  notes: string
  threatLevel: 'low' | 'medium' | 'high'
}

export interface CampaignData {
  campaignName: string
  objective: string
  startDate: string
  endDate: string
  channels: string[]
  targetAudience: string
  budget: string
  keyMessages: string[]
  deliverables: string[]
  successMetrics: string[]
  overallRating: 'poor' | 'fair' | 'good' | 'great' | 'excellent'
}

export interface SOPStepData {
  title: string
  description: string
  responsible?: string
}

export interface SOPData {
  processName: string
  owner: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'per_project' | 'as_needed'
  steps: SOPStepData[]
  tools: string[]
  notes: string
}

export type KBContentType = 'persona' | 'strategy' | 'competitor' | 'campaign' | 'sop'

export type KBStructuredData =
  | PersonaData
  | StrategyData
  | CompetitorData
  | CampaignData
  | SOPData

// Default empty values for each form type
export const EMPTY_PERSONA: PersonaData = {
  personaName: '',
  role: '',
  demographics: '',
  goals: [],
  painPoints: [],
  preferredChannels: [],
  behaviorNotes: '',
  quotes: [],
}

export const EMPTY_STRATEGY: StrategyData = {
  objectiveType: 'awareness',
  targetAudience: '',
  channels: [],
  keyMessages: [],
  kpis: [],
  timeline: '',
  budget: '',
  competitivePosition: '',
}

export const EMPTY_COMPETITOR: CompetitorData = {
  companyName: '',
  website: '',
  industry: '',
  strengths: [],
  weaknesses: [],
  channels: [],
  positioning: '',
  priceRange: '',
  notes: '',
  threatLevel: 'medium',
}

export const EMPTY_CAMPAIGN: CampaignData = {
  campaignName: '',
  objective: '',
  startDate: '',
  endDate: '',
  channels: [],
  targetAudience: '',
  budget: '',
  keyMessages: [],
  deliverables: [],
  successMetrics: [],
  overallRating: 'good',
}

export const EMPTY_SOP: SOPData = {
  processName: '',
  owner: '',
  frequency: 'as_needed',
  steps: [],
  tools: [],
  notes: '',
}

// Auto-mapped category for each content type
export const CONTENT_TYPE_CATEGORY: Record<KBContentType, string> = {
  persona: 'customer_personas',
  strategy: 'marketing_strategy',
  competitor: 'competitor_analysis',
  campaign: 'campaign_history',
  sop: 'sop',
}

// Channel options shared across forms
export const CHANNEL_OPTIONS = [
  'Facebook',
  'Instagram',
  'Twitter/X',
  'LinkedIn',
  'TikTok',
  'YouTube',
  'Email',
  'Blog/SEO',
  'Google Ads',
  'Meta Ads',
  'Podcast',
  'Print',
  'Events',
  'Webinars',
  'SMS',
  'WhatsApp',
]
