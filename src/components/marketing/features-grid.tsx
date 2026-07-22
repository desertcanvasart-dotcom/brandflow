import {
  Palette,
  FileText,
  Globe,
  Sparkles,
  Users,
  Shield,
  Video,
  BarChart3,
  FolderOpen,
  Bell,
  BookOpen,
  Check,
  Mail,
  CalendarDays,
  Library,
  Pencil,
  KeyRound,
  ScrollText,
} from "lucide-react"

interface FeatureCard {
  title: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  color: string
  features: string[]
  span?: "lg"
}

const featureCards: FeatureCard[] = [
  {
    title: "Brand Management",
    icon: Palette,
    color: "text-blue-500",
    span: "lg",
    features: [
      "Multi-brand workspace",
      "Brand profiles & guidelines",
      "Color palettes & typography",
      "Logo & asset management",
      "Brand strategy & content pillars",
      "Brand contacts & client access control",
    ],
  },
  {
    title: "Content Operations",
    icon: FileText,
    color: "text-green-500",
    span: "lg",
    features: [
      "Visual content calendar",
      "10-stage workflow pipeline",
      "Multi-platform drafting (9 platforms)",
      "Version history & comparisons",
      "Rich text editor with media",
      "Publishing queue with scheduling",
    ],
  },
  {
    title: "Web Projects",
    icon: Globe,
    color: "text-cyan-500",
    features: [
      "Web build / redesign / enhance modes",
      "Gantt chart timeline",
      "Deliverables tracking",
      "Milestone management",
      "Phase-based workflow (12 phases)",
    ],
  },
  {
    title: "AI Agents Suite",
    icon: Sparkles,
    color: "text-violet-500",
    span: "lg",
    features: [
      "Ad copy generator (Meta, Google, LinkedIn, TikTok)",
      "CTA suggestions & high-converting variations",
      "SEO research & keyword analysis",
      "Competitor analysis & positioning",
      "AI performance reports",
      "Brand strategy manager",
      "Brief extraction from meeting transcripts",
      "Meeting summarizer & content drafter",
      "Transcript chat — ask questions about any meeting",
    ],
  },
  {
    title: "Knowledge Base & RAG",
    icon: BookOpen,
    color: "text-teal-500",
    span: "lg",
    features: [
      "5 structured form types: Persona, Strategy, Competitor, Campaign & SOP",
      "AI auto-fill — extract structured data from PDFs, URLs, or pasted text",
      "Import from CSV (auto-mapped) or HubSpot CRM",
      "Upload files, paste text, or import from URL",
      "RAG-powered context for all AI agents with semantic search",
      "Version history with diff preview & one-click restore",
      "Real-time collaborative editing with presence & field locks",
      "Public sharing with password protection & expiry dates",
    ],
  },
  {
    title: "Task Library",
    icon: Library,
    color: "text-indigo-500",
    features: [
      "120+ pre-built task templates",
      "10 service types (SEO, web, content, ads…)",
      "Bulk-import templates to any project",
      "Phase-grouped task organization",
      "AI-powered task generation from briefs",
    ],
  },
  {
    title: "Meetings & Video",
    icon: Video,
    color: "text-red-500",
    span: "lg",
    features: [
      "HD video conferencing (LiveKit)",
      "AI transcription (Deepgram)",
      "Automatic meeting summaries",
      "Transcript chat — RAG queries on meetings",
      "Guest meeting rooms (shareable links, no login)",
      "Per-project session history & recordings",
    ],
  },
  {
    title: "Email & Calendar Sync",
    icon: Mail,
    color: "text-sky-500",
    span: "lg",
    features: [
      "Gmail & Outlook email sync per project",
      "Thread viewer & compose from within projects",
      "Link external email threads to projects",
      "Google Calendar sync (read-only)",
      "Calendar events alongside content schedule",
      "Multi-account support per user",
    ],
  },
  {
    title: "Team Collaboration",
    icon: Users,
    color: "text-amber-500",
    features: [
      "Role-based access (6 roles)",
      "Department management with color coding",
      "Task assignments & @mention comments",
      "Activity feed & notifications",
      "Real-time collaboration",
    ],
  },
  {
    title: "Client Portal",
    icon: Shield,
    color: "text-emerald-500",
    features: [
      "Branded client portal",
      "Content approval workflow",
      "Inline feedback & comments",
      "Real-time status tracking",
      "Meeting participation",
    ],
  },
  {
    title: "Analytics & Reporting",
    icon: BarChart3,
    color: "text-purple-500",
    features: [
      "Task distribution charts",
      "Content performance metrics",
      "Team workload analysis",
      "Platform-wise analytics",
      "AI-powered performance reports",
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    color: "text-pink-500",
    features: [
      "5-channel delivery (in-app, email, push, Slack, webhook)",
      "Per-user per-event channel preferences",
      "Quiet hours with timezone-aware DND",
      "Daily/weekly email digests",
      "In-notification actions (approve/reject)",
    ],
  },
  {
    title: "Automation & Admin",
    icon: KeyRound,
    color: "text-orange-500",
    features: [
      "Auto-assignment rules for tasks",
      "API keys with rotation & usage tracking",
      "Full audit log of all org actions",
      "Visual annotations on designs (pin, rect, arrow)",
      "Figma integration & design file sync",
    ],
  },
  {
    title: "File & Asset Management",
    icon: FolderOpen,
    color: "text-lime-500",
    features: [
      "Cloud storage (Cloudflare R2)",
      "Per-brand asset libraries",
      "File attachments on tasks & comments",
      "Drag-and-drop uploads",
      "Asset tagging & search",
    ],
  },
]

export function FeaturesGrid() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything Your Agency Needs
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform to manage brands, create content, run projects, and
            leverage AI — all in one place.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featureCards.map((card) => (
            <div
              key={card.title}
              className={`rounded-xl border bg-card p-6 space-y-3${
                card.span === "lg" ? " md:col-span-2" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <h3 className="font-semibold">{card.title}</h3>
              </div>
              <ul className="space-y-1.5">
                {card.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    <Check className="h-3.5 w-3.5 shrink-0 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
