'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TaskPhaseGroup } from '@/components/task-library/task-phase-group'
import { trpc } from '@/trpc/client'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import { TASK_TYPE_LABELS } from '@/lib/constants'
import type { ServiceType } from '@/types/enums'
import type { Database } from '@/types/database'
import {
  Lightbulb,
  Paintbrush,
  Globe,
  Search,
  FileText,
  Share2,
  Megaphone,
  Mail,
  BarChart3,
  Target,
  FolderPlus,
  type LucideIcon,
} from 'lucide-react'

type TemplateRow = Database['public']['Tables']['task_templates']['Row']

// Service type → Lucide icon mapping
const SERVICE_ICONS: Record<string, LucideIcon> = {
  strategy: Lightbulb,
  branding: Paintbrush,
  website: Globe,
  seo: Search,
  content: FileText,
  social: Share2,
  paid_ads: Megaphone,
  email: Mail,
  analytics: BarChart3,
  cro: Target,
}

export default function TaskLibraryPage() {
  const router = useRouter()
  const [selectedService, setSelectedService] = useState<ServiceType>('strategy')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | null>(null)
  const [addToProjectOpen, setAddToProjectOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')

  // Fetch service summaries for sidebar
  const { data: summaries } = trpc.taskLibrary.getServiceSummaries.useQuery()

  // Fetch templates for the selected service
  const { data: templates, isLoading } = trpc.taskLibrary.listByService.useQuery({
    serviceType: selectedService,
  })

  // Fetch projects for the "Add to Project" dialog
  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: addToProjectOpen,
  })

  // Get the currently selected service summary
  const currentSummary = summaries?.find((s) => s.serviceType === selectedService)

  // Extract distinct task types from current service's templates (for filter chips)
  const availableTypes = useMemo(() => {
    if (!templates) return []
    const types = new Set<string>()
    for (const t of templates) {
      if (t.type) types.add(t.type)
    }
    return Array.from(types).sort()
  }, [templates])

  // Filter templates client-side by search + type
  const filteredTemplates = useMemo(() => {
    if (!templates) return []
    return templates.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.task_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesType = !activeTypeFilter || t.type === activeTypeFilter
      return matchesSearch && matchesType
    })
  }, [templates, searchQuery, activeTypeFilter])

  // Group filtered templates by phase_name (preserving order)
  const groupedByPhase = useMemo(() => {
    const map = new Map<string, TemplateRow[]>()
    for (const t of filteredTemplates) {
      const existing = map.get(t.phase_name) ?? []
      existing.push(t)
      map.set(t.phase_name, existing)
    }
    return map
  }, [filteredTemplates])

  return (
    <>
      <TopBar title="Task Library" />
      <div className="flex gap-6 p-6 min-h-[calc(100vh-4rem)]">
        {/* ─── Left: Service Sidebar ─── */}
        <div className="w-60 shrink-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
            Services
          </p>
          {summaries?.map((summary) => {
            const Icon = SERVICE_ICONS[summary.serviceType] ?? Lightbulb
            const isActive = summary.serviceType === selectedService
            return (
              <button
                key={summary.serviceType}
                type="button"
                onClick={() => {
                  setSelectedService(summary.serviceType as ServiceType)
                  setSearchQuery('')
                  setActiveTypeFilter(null)
                }}
                className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-left transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {SERVICE_TYPE_LABELS[summary.serviceType as ServiceType] ??
                      summary.serviceType}
                  </p>
                  <p
                    className={`text-xs ${
                      isActive
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {summary.taskCount} tasks
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* ─── Right: Main Content ─── */}
        <div className="flex-1 min-w-0">
          {/* Service header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {SERVICE_TYPE_LABELS[selectedService] ?? selectedService}
              </h1>
              {currentSummary && (
                <p className="text-muted-foreground mt-1">
                  {currentSummary.taskCount} tasks &middot; ~
                  {currentSummary.totalHours}h estimated
                </p>
              )}
            </div>
            <Button
              size="sm"
              onClick={() => setAddToProjectOpen(true)}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              Add to Project
            </Button>
          </div>

          {/* Search + type filter chips */}
          <div className="space-y-3 mb-8">
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTypeFilter(null)}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                  activeTypeFilter === null
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground border-border hover:bg-muted'
                }`}
              >
                All
              </button>
              {availableTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() =>
                    setActiveTypeFilter(
                      activeTypeFilter === type ? null : type
                    )
                  }
                  className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                    activeTypeFilter === type
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-muted'
                  }`}
                >
                  {TASK_TYPE_LABELS[type] ?? type}
                </button>
              ))}
            </div>
          </div>

          {/* Task groups by phase */}
          {isLoading ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                  <div className="rounded-lg border bg-card p-4 space-y-3">
                    {[1, 2, 3].map((j) => (
                      <div
                        key={j}
                        className="h-10 bg-muted rounded animate-pulse"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchQuery || activeTypeFilter
                  ? 'No tasks match your filters.'
                  : 'No tasks found for this service.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Array.from(groupedByPhase.entries()).map(
                ([phaseName, tasks]) => (
                  <TaskPhaseGroup
                    key={phaseName}
                    phaseName={phaseName}
                    tasks={tasks}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add to Project dialog */}
      <Dialog open={addToProjectOpen} onOpenChange={setAddToProjectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to Project</DialogTitle>
            <DialogDescription>
              Choose a project to open the task selection drawer for{' '}
              {SERVICE_TYPE_LABELS[selectedService]} templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Select
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {(projects ?? []).map((p: { id: string; name: string }) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddToProjectOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedProjectId}
                onClick={() => {
                  setAddToProjectOpen(false)
                  router.push(
                    `/projects/${selectedProjectId}?tab=tasks&setupTasks=true&services=${selectedService}`
                  )
                }}
              >
                Open Task Drawer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
