'use client'

import { useState } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { AIToolCard } from '@/components/ai/ai-tool-card'
import { AdCopyGenerator } from '@/components/ai/ad-copy-generator'
import { SeoResearch } from '@/components/ai/seo-research'
import { PerformanceReport } from '@/components/ai/performance-report'
import { CompetitorAnalysis } from '@/components/ai/competitor-analysis'
import { CtaSuggestions } from '@/components/ai/cta-suggestions'
import { BrandStrategyManager } from '@/components/ai/brand-strategy-manager'
import {
  Megaphone,
  MousePointerClick,
  Search,
  Target,
  BarChart3,
  Lightbulb,
} from 'lucide-react'

type ToolKey = 'ad-copy' | 'cta' | 'seo' | 'competitor' | 'performance' | 'strategy'

const TOOLS: {
  key: ToolKey
  icon: typeof Megaphone
  iconColor: string
  title: string
  description: string
  section: string
}[] = [
  {
    key: 'ad-copy',
    icon: Megaphone,
    iconColor: 'text-orange-500',
    title: 'Ad Copy Generator',
    description: 'Generate ad copy for any platform with brand context',
    section: 'content',
  },
  {
    key: 'cta',
    icon: MousePointerClick,
    iconColor: 'text-emerald-500',
    title: 'CTA Suggestions',
    description: 'Get high-converting call-to-action variations',
    section: 'content',
  },
  {
    key: 'seo',
    icon: Search,
    iconColor: 'text-cyan-500',
    title: 'SEO Research',
    description: 'Keyword opportunities and content gap analysis',
    section: 'research',
  },
  {
    key: 'competitor',
    icon: Target,
    iconColor: 'text-red-500',
    title: 'Competitor Analysis',
    description: 'Compare positioning, content, and strategy',
    section: 'research',
  },
  {
    key: 'performance',
    icon: BarChart3,
    iconColor: 'text-purple-500',
    title: 'Performance Report',
    description: 'AI-generated insights from your analytics data',
    section: 'performance',
  },
  {
    key: 'strategy',
    icon: Lightbulb,
    iconColor: 'text-amber-500',
    title: 'Brand Strategy',
    description: 'Define pillars, personas, tone, and objectives',
    section: 'strategy',
  },
]

const TOOL_COMPONENTS: Record<ToolKey, React.FC> = {
  'ad-copy': AdCopyGenerator,
  cta: CtaSuggestions,
  seo: SeoResearch,
  competitor: CompetitorAnalysis,
  performance: PerformanceReport,
  strategy: BrandStrategyManager,
}

export default function AIAgentsPage() {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null)

  const handleToolClick = (key: ToolKey) => {
    setActiveTool((prev) => (prev === key ? null : key))
  }

  const ActiveComponent = activeTool ? TOOL_COMPONENTS[activeTool] : null

  const contentTools = TOOLS.filter((t) => t.section === 'content')
  const researchTools = TOOLS.filter((t) => t.section === 'research')
  const performanceTools = TOOLS.filter((t) => t.section === 'performance')
  const strategyTools = TOOLS.filter((t) => t.section === 'strategy')

  return (
    <>
      <TopBar title="Marketing AI Workspace" />
      <div className="flex flex-col gap-6 p-6">
        <div className="max-w-[720px] mx-auto w-full space-y-8">
          {/* Header */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Marketing AI Workspace</h2>
            <p className="text-muted-foreground text-sm mt-1">
              AI-powered tools to create, analyze, and optimize your marketing content.
            </p>
          </div>

          {/* Content Creation */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Content Creation
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {contentTools.map((tool) => (
                <AIToolCard
                  key={tool.key}
                  icon={tool.icon}
                  iconColor={tool.iconColor}
                  title={tool.title}
                  description={tool.description}
                  isActive={activeTool === tool.key}
                  onClick={() => handleToolClick(tool.key)}
                />
              ))}
            </div>
          </section>

          <div className="border-t" />

          {/* Research & Analysis */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Research & Analysis
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {researchTools.map((tool) => (
                <AIToolCard
                  key={tool.key}
                  icon={tool.icon}
                  iconColor={tool.iconColor}
                  title={tool.title}
                  description={tool.description}
                  isActive={activeTool === tool.key}
                  onClick={() => handleToolClick(tool.key)}
                />
              ))}
            </div>
          </section>

          <div className="border-t" />

          {/* Performance & Strategy */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Performance & Strategy
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[...performanceTools, ...strategyTools].map((tool) => (
                <AIToolCard
                  key={tool.key}
                  icon={tool.icon}
                  iconColor={tool.iconColor}
                  title={tool.title}
                  description={tool.description}
                  isActive={activeTool === tool.key}
                  onClick={() => handleToolClick(tool.key)}
                />
              ))}
            </div>
          </section>

          {/* Active tool form */}
          {ActiveComponent && (
            <section className="border-t pt-6">
              <div className={activeTool === 'strategy' ? 'max-w-3xl' : ''}>
                <ActiveComponent />
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
