'use client'

import type { Database } from '@/types/database'
import type {
  PersonaData,
  StrategyData,
  CompetitorData,
  CampaignData,
  SOPData,
} from '@/types/kb-forms'
import { PersonaDisplay } from './persona-display'
import { StrategyDisplay } from './strategy-display'
import { CompetitorDisplay } from './competitor-display'
import { CampaignDisplay } from './campaign-display'
import { SOPDisplay } from './sop-display'

type KBDocumentRow = Database['public']['Tables']['knowledge_base_documents']['Row']

interface StructuredDisplayProps {
  doc: KBDocumentRow
}

/**
 * Routes to the correct display component based on content_type.
 * Returns null for legacy/generic docs without structured data.
 */
export function StructuredDisplay({ doc }: StructuredDisplayProps) {
  if (!doc.content_type || !doc.structured_data) return null

  const data = doc.structured_data as Record<string, unknown>

  switch (doc.content_type) {
    case 'persona':
      return <PersonaDisplay data={data as unknown as PersonaData} />
    case 'strategy':
      return <StrategyDisplay data={data as unknown as StrategyData} />
    case 'competitor':
      return <CompetitorDisplay data={data as unknown as CompetitorData} />
    case 'campaign':
      return <CampaignDisplay data={data as unknown as CampaignData} />
    case 'sop':
      return <SOPDisplay data={data as unknown as SOPData} />
    default:
      // STAGE_B: Additional content types can be added here
      return null
  }
}
