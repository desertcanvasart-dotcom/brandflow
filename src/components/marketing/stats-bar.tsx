import {
  Brain,
  Smartphone,
  GitBranch,
  Video,
  Shield,
  BarChart3,
  Library,
  Mail,
} from "lucide-react"

const stats = [
  { icon: Brain, label: "9 AI Agents" },
  { icon: Smartphone, label: "9 Social Platforms" },
  { icon: GitBranch, label: "10-Stage Workflow" },
  { icon: Library, label: "120+ Task Templates" },
  { icon: Video, label: "Live Video & Transcription" },
  { icon: Mail, label: "Email & Calendar Sync" },
  { icon: Shield, label: "Client Portal" },
  { icon: BarChart3, label: "Advanced Analytics" },
]

export function StatsBar() {
  return (
    <section className="border-y bg-muted/30 py-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-8">
        {stats.map((stat, index) => (
          <div key={stat.label} className="flex items-center gap-8">
            {index > 0 && (
              <div className="hidden h-4 w-px bg-border sm:block" />
            )}
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <stat.icon className="h-4 w-4" />
              <span>{stat.label}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
