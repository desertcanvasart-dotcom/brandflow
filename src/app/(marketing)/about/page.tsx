import type { Metadata } from 'next'
import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import {
  ArrowRight,
  Target,
  Layers,
  Users,
  BarChart3,
  FileText,
  Lightbulb,
  Rocket,
  Eye,
  Wrench,
  Heart,
} from 'lucide-react'

const timelineSteps = [
  {
    icon: Eye,
    title: 'We Saw the Problem',
    description:
      'After years inside agencies, we saw firsthand how teams juggled campaigns, clients, and reports across too many disconnected tools.',
  },
  {
    icon: Lightbulb,
    title: 'We Asked the Right Question',
    description:
      'What if everything an agency needs could exist in one platform? No more switching between systems, no more manual reporting.',
  },
  {
    icon: Wrench,
    title: 'We Built It for Ourselves',
    description:
      'We designed the platform around real workflows — managing campaigns, coordinating teams, and providing transparency to clients.',
  },
  {
    icon: Rocket,
    title: 'We Made It Available to Everyone',
    description:
      'When we realized many agencies faced the same challenges, we expanded the platform and opened it to professionals across the industry.',
  },
]

const capabilities = [
  {
    icon: Target,
    title: 'Campaign Planning & Execution',
    description:
      'Plan, schedule, and launch campaigns across channels from one unified workspace.',
  },
  {
    icon: Layers,
    title: 'Content & Asset Management',
    description:
      'Organize brand assets, content libraries, and creative files in a single hub.',
  },
  {
    icon: Users,
    title: 'Client Collaboration & Approvals',
    description:
      'Give clients branded portals with real-time visibility, feedback, and one-click approvals.',
  },
  {
    icon: BarChart3,
    title: 'Analytics & Performance Tracking',
    description:
      'Monitor performance across all brands and campaigns with unified dashboards.',
  },
  {
    icon: FileText,
    title: 'Automated Reporting',
    description:
      'Generate polished reports automatically — no more manual spreadsheets or slide decks.',
  },
  {
    icon: Heart,
    title: 'Built for Agencies',
    description:
      'Every feature is designed for the people who manage brands, campaigns, and client relationships every day.',
  },
]

const values = [
  {
    title: 'Clarity',
    description:
      'Great work happens when teams have visibility into what matters. We design every feature to surface the right information at the right time.',
  },
  {
    title: 'Alignment',
    description:
      'When everyone — from strategists to clients — is on the same page, projects move faster and results improve.',
  },
  {
    title: 'Simplicity',
    description:
      'Technology should simplify operations, not complicate them. We remove friction from the daily work of agencies and marketing teams.',
  },
]

export const metadata: Metadata = {
  title: 'About',
  description: 'The team and story behind Agency Beats — the project and content operations platform built for agencies.',
  alternates: { canonical: '/about' },
}

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0F172A] pt-32 pb-20 md:pb-28">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.15), rgba(168,85,247,0.08), transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl px-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 mb-6">
              About Us
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-tight">
              Built by People Who Know the Industry
            </h1>
            <p className="mt-6 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto">
              For years, we worked inside agencies, brand teams, and marketing
              operations. We faced the same challenge every team faces:
              everything was scattered. So we built the platform we always wished
              existed.
            </p>
          </div>
        </section>

        {/* The Problem */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400 mb-4">
                  The Problem
                </span>
                <h2 className="text-3xl font-bold tracking-tight">
                  Operational Friction Was the Real Bottleneck
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  The biggest bottleneck for agencies was never creativity,
                  strategy, or talent. It was operational friction. Teams spent
                  too much time switching between tools, preparing reports,
                  searching for files, and trying to keep everyone aligned.
                </p>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  Campaign planning happened in one tool. Client communication
                  lived somewhere else. Reports were built manually. Performance
                  data came from different dashboards. Files were stored across
                  several systems. Nothing truly lived in one place.
                </p>
              </div>

              {/* Visual: scattered tools mockup */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Campaign Tool', color: 'bg-red-500/10 text-red-500' },
                  { label: 'Client Emails', color: 'bg-amber-500/10 text-amber-500' },
                  { label: 'Manual Reports', color: 'bg-orange-500/10 text-orange-500' },
                  { label: 'File Storage', color: 'bg-pink-500/10 text-pink-500' },
                  { label: 'Analytics', color: 'bg-rose-500/10 text-rose-500' },
                  { label: 'Team Chat', color: 'bg-red-500/10 text-red-400' },
                ].map((tool) => (
                  <div
                    key={tool.label}
                    className={`rounded-xl ${tool.color} p-4 text-center text-sm font-medium border border-dashed border-current/20`}
                  >
                    {tool.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline: Our Journey */}
        <section className="bg-muted/30 py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-4">
                Our Journey
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Building the Tool We Always Needed
              </h2>
            </div>

            <div className="space-y-8">
              {timelineSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div key={step.title} className="flex gap-5">
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 text-white font-bold text-sm">
                        {index + 1}
                      </div>
                      {index < timelineSteps.length - 1 && (
                        <div className="w-px flex-1 bg-gradient-to-b from-indigo-500/30 to-transparent mt-2" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="pb-8">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="h-4 w-4 text-indigo-500" />
                        <h3 className="text-lg font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* What We Built */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-4">
                What We Built
              </span>
              <h2 className="text-3xl font-bold tracking-tight">
                Designed for Agencies & Marketing Teams
              </h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                By consolidating essential workflows into a single platform,
                teams can focus less on operational complexity and more on
                delivering meaningful results.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {capabilities.map((cap) => {
                const Icon = cap.icon
                return (
                  <div
                    key={cap.title}
                    className="rounded-2xl border border-border bg-card p-6 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all"
                  >
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Icon className="h-5 w-5 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold">{cap.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {cap.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Our Philosophy */}
        <section className="bg-[#0F172A] py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 mb-4">
                Our Philosophy
              </span>
              <h2 className="text-3xl font-bold text-white tracking-tight">
                We Believe Great Work Needs the Right Foundation
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {values.map((value) => (
                <div
                  key={value.title}
                  className="rounded-2xl bg-white/5 border border-white/10 p-6"
                >
                  <h3 className="text-lg font-semibold text-white">
                    {value.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Looking Forward */}
        <section className="bg-background py-16 md:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-4">
              Looking Forward
            </span>
            <h2 className="text-3xl font-bold tracking-tight">
              Our Ambition Is Simple
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              The marketing industry continues to evolve rapidly, and the tools
              we use must evolve with it. We are committed to continuously
              improving this platform, incorporating new capabilities, and
              listening to the needs of the professionals who use it every day.
            </p>
            <p className="mt-6 text-xl font-semibold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              To create the platform we always wished existed — one that helps
              agencies run smarter, collaborate better, and focus on what matters
              most.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-16 md:py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Ready to run your agency smarter?
            </h2>
            <p className="mt-3 text-white/80">
              Join agencies that have replaced scattered tools with one
              intelligent platform.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center bg-white text-[#0F172A] hover:bg-white/90 rounded-full px-8 py-3 text-sm font-medium transition-all gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center border border-white/30 text-white hover:border-white/60 rounded-full px-8 py-3 text-sm font-medium transition-all"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
