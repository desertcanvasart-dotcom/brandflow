'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import {
  LogIn,
  LayoutDashboard,
  Palette,
  FolderKanban,
  Kanban,
  CalendarDays,
  GanttChart,
  Send,
  Video,
  Bot,
  BarChart3,
  Bell,
  Users,
  Settings,
  CreditCard,
  ExternalLink,
  Shield,
  ClipboardList,
  List,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'

/* ------------------------------------------------------------------ */
/*  Icon resolver (avoids passing components across server/client)     */
/* ------------------------------------------------------------------ */

const iconMap: Record<string, LucideIcon> = {
  LogIn,
  LayoutDashboard,
  Palette,
  FolderKanban,
  Kanban,
  CalendarDays,
  GanttChart,
  Send,
  Video,
  Bot,
  BarChart3,
  Bell,
  Users,
  Settings,
  CreditCard,
  ExternalLink,
  Shield,
  ClipboardList,
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface WalkthroughSection {
  id: string
  title: string
  icon: string // icon name key into iconMap
}

interface WalkthroughLayoutProps {
  title: string
  badge?: string
  subtitle?: string
  lastUpdated?: string
  sections: WalkthroughSection[]
  children: ReactNode
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function WalkthroughLayout({
  title,
  badge,
  subtitle,
  lastUpdated,
  sections,
  children,
}: WalkthroughLayoutProps) {
  const [activeSection, setActiveSection] = useState<string>(
    sections[0]?.id ?? ''
  )
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const isScrollingRef = useRef(false)

  /* ---------- Intersection Observer ---------- */

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return

        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            return a.boundingClientRect.top - b.boundingClientRect.top
          })

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: '-96px 0px -60% 0px',
        threshold: [0, 0.1],
      }
    )

    const sectionElements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[]

    sectionElements.forEach((el) => observer.observe(el))

    return () => observer.disconnect()
  }, [sections])

  /* ---------- Smooth scroll handler ---------- */

  function handleSidebarClick(e: React.MouseEvent, sectionId: string) {
    e.preventDefault()
    const el = document.getElementById(sectionId)
    if (!el) return

    isScrollingRef.current = true
    setActiveSection(sectionId)

    const headerOffset = 96
    const elementPosition =
      el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: elementPosition - headerOffset,
      behavior: 'smooth',
    })

    setTimeout(() => {
      isScrollingRef.current = false
    }, 800)
  }

  /* ---------- Sidebar item ---------- */

  function SidebarItem({
    section,
    index,
    onClick,
  }: {
    section: WalkthroughSection
    index: number
    onClick?: () => void
  }) {
    const Icon = iconMap[section.icon]
    return (
      <li>
        <a
          href={`#${section.id}`}
          onClick={(e) => {
            handleSidebarClick(e, section.id)
            onClick?.()
          }}
          className={cn(
            'flex items-start gap-2 rounded-lg px-3 py-2 text-[13px] leading-snug transition-colors',
            activeSection === section.id
              ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <span className="text-xs font-mono text-muted-foreground/70 w-5 shrink-0 pt-px">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="line-clamp-2">{section.title}</span>
        </a>
      </li>
    )
  }

  /* ---------- Render ---------- */

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

        {/* Content with sidebar */}
        <section className="bg-background py-12 md:py-16">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
              {/* Desktop sidebar */}
              <aside className="hidden lg:block">
                <nav className="sticky top-24">
                  <ScrollArea className="h-[calc(100vh-7rem)]">
                    <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Sections
                    </p>
                    <ul className="space-y-0.5 pr-4">
                      {sections.map((section, index) => (
                        <SidebarItem
                          key={section.id}
                          section={section}
                          index={index}
                        />
                      ))}
                    </ul>
                  </ScrollArea>
                </nav>
              </aside>

              {/* Mobile sidebar trigger */}
              <div className="lg:hidden mb-6 sticky top-20 z-30 bg-background/80 backdrop-blur-sm py-3 -mx-4 px-4 border-b border-border">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <List className="h-4 w-4" />
                      Table of Contents
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[300px]">
                    <SheetHeader>
                      <SheetTitle>Sections</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-[calc(100vh-6rem)] mt-4">
                      <ul className="space-y-0.5 pr-4">
                        {sections.map((section, index) => (
                          <SidebarItem
                            key={section.id}
                            section={section}
                            index={index}
                            onClick={() => setMobileNavOpen(false)}
                          />
                        ))}
                      </ul>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Content */}
              <div className="min-w-0">{children}</div>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
