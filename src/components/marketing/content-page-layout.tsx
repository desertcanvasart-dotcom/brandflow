import { type ReactNode } from 'react'
import { type LucideIcon, Info, Lightbulb, AlertTriangle } from 'lucide-react'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

/* ------------------------------------------------------------------ */
/*  Content block types                                                */
/* ------------------------------------------------------------------ */

interface ParagraphBlock {
  type: 'paragraph'
  text: string
}

interface ListBlock {
  type: 'list'
  items: string[]
}

interface TipBlock {
  type: 'tip'
  variant?: 'info' | 'tip' | 'warning'
  text: string
}

interface StepsBlock {
  type: 'steps'
  items: { label: string; description: string }[]
}

export type ContentBlock = ParagraphBlock | ListBlock | TipBlock | StepsBlock

/* ------------------------------------------------------------------ */
/*  Section & page props                                               */
/* ------------------------------------------------------------------ */

export interface ContentSection {
  title: string
  icon?: LucideIcon
  content: ContentBlock[]
}

export interface ContentPageLayoutProps {
  /** Page title shown in the hero */
  title: string
  /** Small badge/tag above the title */
  badge?: string
  /** Optional subtitle below title */
  subtitle?: string
  /** "Last updated" date string – shown when provided */
  lastUpdated?: string
  /** Introductory paragraph */
  intro: string
  /** Numbered content sections */
  sections: ContentSection[]
  /** Footer contact line – defaults to legal@ */
  footerContact?: {
    email: string
    text: string
  }
}

/* ------------------------------------------------------------------ */
/*  Tip variant helpers                                                */
/* ------------------------------------------------------------------ */

const tipStyles: Record<string, { bg: string; border: string; icon: LucideIcon; iconColor: string }> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-500/20',
    icon: Info,
    iconColor: 'text-blue-500',
  },
  tip: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    border: 'border-indigo-200 dark:border-indigo-500/20',
    icon: Lightbulb,
    iconColor: 'text-indigo-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/20',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
}

/* ------------------------------------------------------------------ */
/*  Block renderer                                                     */
/* ------------------------------------------------------------------ */

function RenderBlock({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {block.text}
        </p>
      )

    case 'list':
      return (
        <ul className="space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      )

    case 'tip': {
      const variant = block.variant ?? 'tip'
      const style = tipStyles[variant]
      const Icon = style.icon
      return (
        <div className={`rounded-xl border ${style.border} ${style.bg} p-4 flex items-start gap-3`}>
          <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${style.iconColor}`} />
          <p className="text-sm leading-relaxed">
            {block.text}
          </p>
        </div>
      )
    }

    case 'steps':
      return (
        <div className="space-y-3">
          {block.items.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="h-6 w-6 rounded-full bg-indigo-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      )

    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/*  Layout component                                                   */
/* ------------------------------------------------------------------ */

export function ContentPageLayout({
  title,
  badge,
  subtitle,
  lastUpdated,
  intro,
  sections,
  footerContact,
}: ContentPageLayoutProps) {
  const contact = footerContact ?? {
    email: 'legal@agencybeats.app',
    text: 'If you have any questions about this policy, please contact us at',
  }

  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0F172A] pt-32 pb-16">
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

          <div className="relative mx-auto max-w-3xl px-4 text-center">
            {badge && (
              <span className="inline-flex items-center rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 mb-4">
                {badge}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
                {subtitle}
              </p>
            )}
            {lastUpdated && (
              <p className="mt-3 text-sm text-slate-500">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        </section>

        {/* Content */}
        <section className="bg-background py-12 md:py-16">
          <div className="mx-auto max-w-3xl px-4">
            <p className="text-muted-foreground leading-relaxed mb-10">
              {intro}
            </p>

            <div className="space-y-10">
              {sections.map((section, index) => {
                const SectionIcon = section.icon
                return (
                  <div key={section.title}>
                    <h2 className="text-xl font-bold mb-4 flex items-start gap-3">
                      <span className="text-indigo-500 font-mono text-sm mt-1">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex items-center gap-2">
                        {SectionIcon && (
                          <SectionIcon className="h-5 w-5 text-indigo-500" />
                        )}
                        {section.title}
                      </span>
                    </h2>
                    <div className="space-y-4 pl-9">
                      {section.content.map((block, bIndex) => (
                        <RenderBlock key={bIndex} block={block} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer contact */}
            <div className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground">
                {contact.text}{' '}
                <a
                  href={`mailto:${contact.email}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  {contact.email}
                </a>
                {' '}or write to us at: 31 Central Avenue, Mokattam, Cairo 11571, Egypt.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
