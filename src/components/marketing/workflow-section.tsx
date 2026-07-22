import {
  Lightbulb,
  CalendarDays,
  PenTool,
  CheckCircle,
  Send,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"

interface WorkflowStep {
  icon: LucideIcon
  label: string
  description: string
}

const steps: WorkflowStep[] = [
  { icon: Lightbulb, label: "Idea", description: "Brainstorm and plan" },
  { icon: CalendarDays, label: "Plan", description: "Schedule and assign" },
  { icon: PenTool, label: "Create", description: "Draft and design" },
  { icon: CheckCircle, label: "Approve", description: "Review and approve" },
  { icon: Send, label: "Publish", description: "Go live on platforms" },
  { icon: TrendingUp, label: "Analyze", description: "Measure and optimize" },
]

export function WorkflowSection() {
  return (
    <section id="workflow" className="bg-[#0F172A] text-white py-20 md:py-28 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From idea to impact
          </h2>
          <p className="mt-4 text-slate-400">
            A streamlined 6-step workflow that takes your content from concept to
            published results.
          </p>
        </div>

        <div className="flex items-center justify-center gap-0 flex-wrap">
          {steps.map((step, index) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center text-center w-32">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mb-3">
                  <step.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-white">
                  {step.label}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {step.description}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div className="hidden md:flex items-center mx-2">
                  <div className="w-8 h-px bg-gradient-to-r from-indigo-500/50 to-purple-500/50" />
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/50" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 max-w-2xl mx-auto">
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
