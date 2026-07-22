import { MarketingHeader } from '@/components/marketing/marketing-header'
import { HeroSection } from '@/components/marketing/hero-section'
import { StatsBar } from '@/components/marketing/stats-bar'
import { ProductPreview } from '@/components/marketing/product-preview'
import { ProblemSection } from '@/components/marketing/problem-section'
import { SolutionSection } from '@/components/marketing/solution-section'
import { WorkflowSection } from '@/components/marketing/workflow-section'
import { FeaturesGrid } from '@/components/marketing/features-grid'
import { AIShowcase } from '@/components/marketing/ai-showcase'
import { AnalyticsPreview } from '@/components/marketing/analytics-preview'
import { PortalDocs } from '@/components/marketing/portal-docs'
import { IntegrationsSection } from '@/components/marketing/integrations-section'
import { TestimonialsSection } from '@/components/marketing/testimonials-section'
import { PricingSection } from '@/components/marketing/pricing-section'
import { CTASection } from '@/components/marketing/cta-section'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

export default function MarketingPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        <HeroSection />
        <StatsBar />
        <ProductPreview />
        <ProblemSection />
        <SolutionSection />
        <WorkflowSection />
        <FeaturesGrid />
        <AIShowcase />
        <AnalyticsPreview />
        <PortalDocs />
        <IntegrationsSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <MarketingFooter />
    </>
  )
}
