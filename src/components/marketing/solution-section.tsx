import {
  CheckCircle2,
  Users,
  MessageSquare,
  BarChart3,
  Clock,
  Eye,
  TrendingUp,
  Zap,
} from 'lucide-react'

function CampaignMockup() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-4">
      {/* Project header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h5 className="text-sm font-semibold text-white">Spring Campaign 2026</h5>
          <p className="text-[10px] text-slate-500">Acme Corp</p>
        </div>
        <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
          On Track
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500">Progress</span>
          <span className="text-[10px] text-slate-400">68%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/5">
          <div className="h-1.5 w-[68%] rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
        </div>
      </div>

      {/* Team avatars & status */}
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-cyan-500'].map((bg, i) => (
            <div
              key={i}
              className={`h-6 w-6 rounded-full ${bg} border-2 border-[#111827] flex items-center justify-center`}
            >
              <span className="text-[8px] font-bold text-white">
                {['A', 'B', 'C', 'D'][i]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex gap-1.5">
          {['In Review', 'Drafting', 'Approved'].map((status, i) => (
            <span
              key={status}
              className={`rounded-md px-2 py-0.5 text-[9px] font-medium ${
                i === 0
                  ? 'bg-amber-500/20 text-amber-300'
                  : i === 1
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-emerald-500/20 text-emerald-300'
              }`}
            >
              {status}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function PortalMockup() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h5 className="text-sm font-semibold text-white">Client Portal</h5>
        <Eye className="h-4 w-4 text-slate-500" />
      </div>

      {/* Approval items */}
      <div className="space-y-2">
        {[
          { title: 'Instagram carousel - Product launch', status: 'Pending', statusColor: 'bg-amber-500/20 text-amber-300' },
          { title: 'Blog post - SEO strategy guide', status: 'Approved', statusColor: 'bg-emerald-500/20 text-emerald-300' },
          { title: 'LinkedIn article - Q1 results', status: 'Revision', statusColor: 'bg-red-500/20 text-red-300' },
        ].map((item) => (
          <div
            key={item.title}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-[11px] text-slate-300 truncate mr-3">{item.title}</span>
            <span className={`rounded-md px-2 py-0.5 text-[9px] font-medium shrink-0 ${item.statusColor}`}>
              {item.status}
            </span>
          </div>
        ))}
      </div>

      {/* Comment bubble */}
      <div className="flex items-start gap-2 rounded-lg bg-indigo-500/5 border border-indigo-500/10 p-3">
        <MessageSquare className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] text-indigo-300 font-medium">Client Feedback</p>
          <p className="text-[10px] text-slate-400">
            &quot;Love the visuals! Can we adjust the headline copy?&quot;
          </p>
        </div>
      </div>
    </div>
  )
}

function AnalyticsMockup() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/5 p-4 space-y-4">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: 'ROI', value: '340%', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Engagement', value: '18.2%', icon: Zap, color: 'text-indigo-400' },
          { label: 'Content Score', value: '92/100', icon: CheckCircle2, color: 'text-purple-400' },
          { label: 'Efficiency', value: '+24%', icon: Clock, color: 'text-cyan-400' },
        ].map((metric) => (
          <div key={metric.label} className="rounded-lg bg-white/5 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <metric.icon className={`h-3 w-3 ${metric.color}`} />
              <span className="text-[9px] text-slate-500">{metric.label}</span>
            </div>
            <p className="text-sm font-bold text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      {/* Chart bars */}
      <div className="flex items-end justify-between gap-2 h-20 px-1">
        {[40, 65, 55, 80, 70, 90, 60].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-gradient-to-t from-indigo-500 to-purple-500 opacity-70"
              style={{ height: `${height}%` }}
            />
            <span className="text-[8px] text-slate-600">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

const solutions = [
  {
    title: 'Manage campaigns',
    description:
      'Plan, schedule, and execute campaigns in a unified workspace. Assign tasks, set deadlines, and track progress across every brand.',
    mockup: CampaignMockup,
  },
  {
    title: 'Collaborate with clients',
    description:
      'Give clients real-time visibility into their projects. Content approvals, feedback, and status updates \u2014 all in a branded portal.',
    mockup: PortalMockup,
  },
  {
    title: 'Track performance',
    description:
      'Monitor campaign ROI, content performance, and team productivity with AI-powered analytics and automated reports.',
    mockup: AnalyticsMockup,
  },
]

export function SolutionSection() {
  return (
    <section id="solutions" className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            One platform. Every capability.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Replace your tool stack with a unified workspace designed for agencies.
          </p>
        </div>

        {/* Solution cards */}
        <div className="space-y-8">
          {solutions.map((solution) => (
            <div
              key={solution.title}
              className="relative overflow-hidden bg-[#111827] rounded-2xl p-8 text-white hover:-translate-y-1 transition-transform duration-300 before:absolute before:top-0 before:left-8 before:right-8 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-500 before:to-transparent"
            >
              <div className="flex flex-col md:flex-row gap-8 items-center">
                {/* Text */}
                <div className="md:w-1/2 space-y-4">
                  <h3 className="text-2xl font-bold">{solution.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{solution.description}</p>
                </div>

                {/* Mockup */}
                <div className="md:w-1/2">
                  <solution.mockup />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
