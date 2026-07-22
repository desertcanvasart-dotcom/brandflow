import {
  Blocks,
  FileSpreadsheet,
  MessageCircleX,
  TrendingDown,
  X,
} from 'lucide-react'

const painPoints = [
  {
    title: 'Too many disconnected tools',
    description: 'Switching between 5+ apps wastes hours every week.',
    icon: Blocks,
  },
  {
    title: 'Manual reporting is painful',
    description: 'Copying data into spreadsheets for every client review.',
    icon: FileSpreadsheet,
  },
  {
    title: 'Client communication scattered',
    description: 'Feedback lost across emails, Slack, and meetings.',
    icon: MessageCircleX,
  },
  {
    title: 'No clear performance insights',
    description: 'Making decisions without real-time campaign data.',
    icon: TrendingDown,
  },
]

const scatteredTools = [
  { label: 'Analytics', rotate: 'rotate-[-2deg]' },
  { label: 'Slack', rotate: 'rotate-[1deg]' },
  { label: 'Email', rotate: 'rotate-[3deg]' },
  { label: 'Ads Manager', rotate: 'rotate-[-1deg]' },
  { label: 'Spreadsheets', rotate: 'rotate-[2deg]' },
  { label: 'Calendar', rotate: 'rotate-[-3deg]' },
  { label: 'Figma', rotate: 'rotate-[1deg]' },
]

export function ProblemSection() {
  return (
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <h2 className="text-3xl md:text-4xl font-bold text-center">
          Running an agency shouldn&apos;t feel chaotic
        </h2>

        {/* Pain points grid */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {painPoints.map((point) => (
            <div
              key={point.title}
              className="rounded-2xl border border-red-200/50 bg-red-50/50 p-5 space-y-2"
            >
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-400 shrink-0" />
                <point.icon className="h-4 w-4 text-red-400 shrink-0" />
              </div>
              <h3 className="font-semibold text-sm">{point.title}</h3>
              <p className="text-sm text-muted-foreground">{point.description}</p>
            </div>
          ))}
        </div>

        {/* Messy tool stack */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 opacity-60">
          {scatteredTools.map((tool) => (
            <span
              key={tool.label}
              className={`rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground ${tool.rotate}`}
            >
              {tool.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
