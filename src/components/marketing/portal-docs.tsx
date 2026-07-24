import {
  Shield,
  CheckCircle,
  MessageSquare,
  BarChart3,
  Video,
  ArrowRight,
} from 'lucide-react'

const features = [
  { icon: Shield, label: 'Branded client dashboards' },
  { icon: CheckCircle, label: 'One-click content approvals' },
  { icon: MessageSquare, label: 'Inline feedback and comments' },
  { icon: BarChart3, label: 'Automated performance reports' },
  { icon: Video, label: 'Join meetings directly from portal' },
]

const contentItems = [
  {
    title: 'Instagram Story — Summer Campaign',
    status: 'Pending',
    dotColor: 'bg-amber-400',
  },
  {
    title: 'LinkedIn Post — Q1 Results',
    status: 'Approved',
    dotColor: 'bg-green-400',
  },
  {
    title: 'Blog Article — Industry Trends',
    status: 'In Review',
    dotColor: 'bg-indigo-400',
  },
  {
    title: 'Facebook Ad — Product Launch',
    status: 'Published',
    dotColor: 'bg-emerald-400',
  },
]

export function PortalDocs() {
  return (
    <section id="portal" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: text content */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              <Shield className="h-3 w-3" />
              Client Portal
            </span>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Keep clients informed without endless meetings
            </h2>

            <p className="mt-4 text-lg text-muted-foreground">
              Give every client a branded portal with real-time project
              visibility, content approvals, and performance dashboards.
            </p>

            <ul className="mt-8 space-y-4">
              {features.map((feature) => {
                const Icon = feature.icon
                return (
                  <li key={feature.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-indigo-500" />
                    </div>
                    <span className="text-sm font-medium">{feature.label}</span>
                  </li>
                )
              })}
            </ul>

            <a
              href="/guide/client-portal"
              className="mt-8 text-indigo-600 hover:text-indigo-500 text-sm font-medium inline-flex items-center gap-1"
            >
              Learn more about the portal
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Right: client dashboard mockup */}
          <div className="bg-[#111827] rounded-2xl border border-white/5 p-5 text-white">
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="h-9 w-9 rounded-full bg-indigo-500 flex items-center justify-center text-sm font-bold">
                A
              </div>
              <div>
                <p className="text-sm font-semibold">Client Portal</p>
                <p className="text-xs text-slate-400">Acme Corp</p>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl bg-amber-500/10 p-3 text-center">
                <p className="text-lg font-bold text-amber-400">5</p>
                <p className="text-[10px] text-slate-400">Pending Review</p>
              </div>
              <div className="rounded-xl bg-green-500/10 p-3 text-center">
                <p className="text-lg font-bold text-green-400">12</p>
                <p className="text-[10px] text-slate-400">Approved</p>
              </div>
              <div className="rounded-xl bg-indigo-500/10 p-3 text-center">
                <p className="text-lg font-bold text-indigo-400">28</p>
                <p className="text-[10px] text-slate-400">Published</p>
              </div>
            </div>

            {/* Content items list */}
            <div className="space-y-2.5">
              {contentItems.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2.5"
                >
                  <span className="text-xs text-slate-300 truncate max-w-[200px]">
                    {item.title}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400 shrink-0">
                    <span className={`h-2 w-2 rounded-full ${item.dotColor}`} />
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Leave Feedback mock input */}
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs text-slate-500">Leave feedback...</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
