import { ContentPageLayout, type ContentSection } from './content-page-layout'

/**
 * LegalPageLayout — thin wrapper around ContentPageLayout for legal pages.
 * Accepts the original simple { title, content: string[] } sections and
 * converts them into ContentBlock[] automatically.
 */

interface LegalSection {
  title: string
  content: string[]
}

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  intro: string
  sections: LegalSection[]
}

export function LegalPageLayout({
  title,
  lastUpdated,
  intro,
  sections,
}: LegalPageLayoutProps) {
  const contentSections: ContentSection[] = sections.map((s) => ({
    title: s.title,
    content: s.content.map((text) => ({ type: 'paragraph' as const, text })),
  }))

  return (
    <ContentPageLayout
      title={title}
      lastUpdated={lastUpdated}
      intro={intro}
      sections={contentSections}
      footerContact={{
        email: 'legal@agencybeats.app',
        text: 'If you have any questions about this policy, please contact us at',
      }}
    />
  )
}
