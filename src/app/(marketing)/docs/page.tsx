import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import {
  BookOpen,
  Code2,
  Rocket,
  Users,
  Shield,
  Zap,
  BarChart3,
  Palette,
  ArrowRight,
  Search,
} from 'lucide-react'

const categories = [
  {
    title: 'Getting Started',
    description: 'Set up your agency workspace and invite your team in minutes.',
    icon: Rocket,
    links: [
      { label: 'Quick Start Guide', href: '#' },
      { label: 'Creating Your Organization', href: '#' },
      { label: 'Inviting Team Members', href: '#' },
      { label: 'Setting Up Your First Brand', href: '#' },
    ],
  },
  {
    title: 'Brand Management',
    description: 'Organize brands, assets, and guidelines in one place.',
    icon: Palette,
    links: [
      { label: 'Brand Profiles', href: '#' },
      { label: 'Asset Libraries', href: '#' },
      { label: 'Brand Guidelines', href: '#' },
      { label: 'Multi-Brand Workflows', href: '#' },
    ],
  },
  {
    title: 'Content Operations',
    description: 'Plan, create, approve, and publish content at scale.',
    icon: BookOpen,
    links: [
      { label: 'Content Calendar', href: '#' },
      { label: 'Approval Workflows', href: '#' },
      { label: 'Publishing & Scheduling', href: '#' },
      { label: 'Content Templates', href: '#' },
    ],
  },
  {
    title: 'Web Projects',
    description: 'Track web builds, redesigns, and enhancements with Gantt views.',
    icon: Code2,
    links: [
      { label: 'Project Setup', href: '#' },
      { label: 'Gantt Charts & Milestones', href: '#' },
      { label: 'Deliverables & Tasks', href: '#' },
      { label: 'Visual Annotations', href: '#' },
    ],
  },
  {
    title: 'Client Portal',
    description: 'Give clients branded dashboards with approvals and reports.',
    icon: Users,
    links: [
      { label: 'Portal Configuration', href: '#' },
      { label: 'Client Permissions', href: '#' },
      { label: 'Feedback & Comments', href: '#' },
      { label: 'White-Label Setup', href: '#' },
    ],
  },
  {
    title: 'AI Agents',
    description: 'Generate ad copy, SEO research, competitor analysis, and more.',
    icon: Zap,
    links: [
      { label: 'AI Content Generator', href: '#' },
      { label: 'SEO Research Agent', href: '#' },
      { label: 'Competitor Analysis', href: '#' },
      { label: 'Performance Reports', href: '#' },
    ],
  },
  {
    title: 'Analytics & Reporting',
    description: 'Track performance across all brands and campaigns.',
    icon: BarChart3,
    links: [
      { label: 'Dashboard Overview', href: '#' },
      { label: 'Custom Reports', href: '#' },
      { label: 'Engagement Metrics', href: '#' },
      { label: 'Export & Sharing', href: '#' },
    ],
  },
  {
    title: 'API Reference',
    description: 'Integrate Agency Beats into your existing tools and workflows.',
    icon: Code2,
    links: [
      { label: 'Authentication', href: '/docs/api' },
      { label: 'Brands API', href: '/docs/api' },
      { label: 'Content API', href: '/docs/api' },
      { label: 'Webhooks', href: '/docs/api' },
    ],
  },
  {
    title: 'Security & Compliance',
    description: 'Enterprise-grade security with SOC 2 and GDPR compliance.',
    icon: Shield,
    links: [
      { label: 'Data Privacy', href: '#' },
      { label: 'Role-Based Access', href: '#' },
      { label: 'SSO & SAML', href: '#' },
      { label: 'Audit Logs', href: '#' },
    ],
  },
]

export default function DocsPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0F172A] pt-32 pb-20">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.15), rgba(168,85,247,0.08), transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              Documentation
            </h1>
            <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
              Everything you need to get the most out of Agency Beats. Guides,
              tutorials, and API references for your team.
            </p>

            {/* Search bar (visual placeholder) */}
            <div className="mt-8 mx-auto max-w-lg">
              <div className="flex items-center gap-3 rounded-full bg-white/5 border border-white/10 px-5 py-3">
                <Search className="h-5 w-5 text-slate-500" />
                <span className="text-sm text-slate-500">
                  Search documentation...
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Cards */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => {
                const Icon = category.icon
                return (
                  <div
                    key={category.title}
                    className="group rounded-2xl border border-border bg-card p-6 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-indigo-500" />
                      </div>
                      <h3 className="text-lg font-semibold">{category.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {category.description}
                    </p>
                    <ul className="space-y-2">
                      {category.links.map((link) => (
                        <li key={link.label}>
                          <Link
                            href={link.href}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 inline-flex items-center gap-1 group/link"
                          >
                            <ArrowRight className="h-3 w-3 opacity-0 -ml-4 group-hover/link:opacity-100 group-hover/link:ml-0 transition-all" />
                            {link.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Help CTA */}
        <section className="bg-[#0F172A] py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-2xl font-bold text-white">
              Can&apos;t find what you&apos;re looking for?
            </h2>
            <p className="mt-3 text-slate-400">
              Our support team is here to help you get up and running.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-6 py-2.5 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                Contact Support
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center border border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white rounded-full px-6 py-2.5 text-sm font-medium transition-all"
              >
                Join Community
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
