'use client'

import { useState, useMemo } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { trpc } from '@/trpc/client'
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  type ServiceType,
} from '@/types/enums'
import type { Database } from '@/types/database'
import {
  Search,
  Clock,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type TemplateRow = Database['public']['Tables']['task_templates']['Row']

interface TaskSelectionDrawerProps {
  projectId: string
  /** Pre-select a service type tab */
  serviceType?: string
  /** Link tasks to a brief */
  briefId?: string
  /** Pre-check these template IDs */
  preSelectedTemplateIds?: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TaskSelectionDrawer({
  projectId,
  serviceType,
  briefId,
  preSelectedTemplateIds,
  open,
  onOpenChange,
}: TaskSelectionDrawerProps) {
  const [activeService, setActiveService] = useState<ServiceType>(
    (serviceType as ServiceType) ?? 'website'
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preSelectedTemplateIds ?? [])
  )
  const [search, setSearch] = useState('')
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set())

  // Fetch templates for the active service type
  const { data: templates, isLoading } =
    trpc.taskLibrary.listByService.useQuery(
      { serviceType: activeService },
      { enabled: open }
    )

  // Fetch service summaries for the tab badges
  const { data: summaries } = trpc.taskLibrary.getServiceSummaries.useQuery(
    undefined,
    { enabled: open }
  )

  const addMutation = trpc.projectTasks.addFromTemplates.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Added ${result.insertedCount} tasks across ${result.phaseCount} phases`
      )
      setSelectedIds(new Set())
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const utils = trpc.useUtils()

  // Group templates by phase_name
  const phaseGroups = useMemo(() => {
    if (!templates) return []
    const filtered = search
      ? templates.filter(
          (t) =>
            t.task_name.toLowerCase().includes(search.toLowerCase()) ||
            t.phase_name.toLowerCase().includes(search.toLowerCase()) ||
            (t.type ?? '').toLowerCase().includes(search.toLowerCase())
        )
      : templates

    const map = new Map<
      string,
      { phaseName: string; templates: TemplateRow[]; totalHours: number }
    >()

    for (const t of filtered) {
      if (!map.has(t.phase_name)) {
        map.set(t.phase_name, {
          phaseName: t.phase_name,
          templates: [],
          totalHours: 0,
        })
      }
      const group = map.get(t.phase_name)!
      group.templates.push(t)
      group.totalHours += Number(t.estimated_hours ?? 0)
    }

    return Array.from(map.values())
  }, [templates, search])

  // Selection helpers
  const toggleTemplate = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePhase = (phaseName: string) => {
    const group = phaseGroups.find((g) => g.phaseName === phaseName)
    if (!group) return
    const allSelected = group.templates.every((t) => selectedIds.has(t.id))

    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const t of group.templates) {
        if (allSelected) next.delete(t.id)
        else next.add(t.id)
      }
      return next
    })
  }

  const togglePhaseCollapse = (phaseName: string) => {
    setCollapsedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseName)) next.delete(phaseName)
      else next.add(phaseName)
      return next
    })
  }

  // Compute totals for selected templates
  const selectedTemplates = useMemo(
    () => (templates ?? []).filter((t) => selectedIds.has(t.id)),
    [templates, selectedIds]
  )

  const totalSelectedHours = useMemo(
    () =>
      selectedTemplates.reduce(
        (sum, t) => sum + Number(t.estimated_hours ?? 0),
        0
      ),
    [selectedTemplates]
  )

  const handleConfirm = () => {
    if (selectedIds.size === 0) return
    addMutation.mutate(
      {
        projectId,
        templateIds: Array.from(selectedIds),
        serviceType: activeService,
        briefId,
      },
      {
        onSuccess: () => {
          utils.projectTasks.listByProject.invalidate({ projectId })
          utils.projectTasks.getProjectHealth.invalidate({ projectId })
          utils.task.list.invalidate()
        },
      }
    )
  }

  const summaryMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const s of summaries ?? []) {
      m.set(s.serviceType, s.taskCount)
    }
    return m
  }, [summaries])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl flex flex-col p-0 h-full"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b space-y-3 shrink-0">
          <SheetTitle>Add Tasks from Library</SheetTitle>
          <SheetDescription>
            Browse templates by service type and phase. Selected tasks will be
            added to your project.
          </SheetDescription>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Service type tabs */}
          <div className="-mx-6 px-6 overflow-x-auto scrollbar-none">
            <Tabs
              value={activeService}
              onValueChange={(v) => {
                setActiveService(v as ServiceType)
                setSearch('')
              }}
            >
              <TabsList className="inline-flex w-max">
                {SERVICE_TYPES.map((st) => (
                  <TabsTrigger key={st} value={st} className="text-xs gap-1 whitespace-nowrap">
                    {SERVICE_TYPE_LABELS[st]}
                    <span className="text-muted-foreground">
                      {summaryMap.get(st) ?? 0}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </SheetHeader>

        {/* Template browser */}
        <ScrollArea className="flex-1 min-h-0 px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : phaseGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {search
                  ? 'No templates match your search'
                  : 'No templates for this service type'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {phaseGroups.map((group) => {
                const isCollapsed = collapsedPhases.has(group.phaseName)
                const allSelected = group.templates.every((t) =>
                  selectedIds.has(t.id)
                )
                const someSelected =
                  !allSelected &&
                  group.templates.some((t) => selectedIds.has(t.id))
                const selectedCount = group.templates.filter((t) =>
                  selectedIds.has(t.id)
                ).length

                return (
                  <div
                    key={group.phaseName}
                    className="border rounded-lg overflow-hidden"
                  >
                    {/* Phase header */}
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                      onClick={() => togglePhaseCollapse(group.phaseName)}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <Checkbox
                        checked={allSelected}
                        data-state={
                          someSelected ? 'indeterminate' : undefined
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          togglePhase(group.phaseName)
                        }}
                      />
                      <span className="font-medium text-sm flex-1 text-left">
                        {group.phaseName}
                      </span>
                      {selectedCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {selectedCount} selected
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {group.totalHours}h
                      </span>
                    </button>

                    {/* Template list */}
                    {!isCollapsed && (
                      <div className="divide-y">
                        {group.templates.map((template) => {
                          const isSelected = selectedIds.has(template.id)
                          return (
                            <label
                              key={template.id}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  toggleTemplate(template.id)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium">
                                    {template.task_name}
                                  </span>
                                  {template.type && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {template.type}
                                    </Badge>
                                  )}
                                </div>
                                {template.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {template.description}
                                  </p>
                                )}
                              </div>
                              {template.estimated_hours && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                  <Clock className="h-3 w-3" />
                                  {template.estimated_hours}h
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer with selection summary + confirm button */}
        <div className="border-t px-6 py-4 bg-background shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {selectedIds.size > 0 ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>
                    <strong>{selectedIds.size}</strong> tasks selected ·{' '}
                    <strong>{totalSelectedHours}</strong>h total
                  </span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                    onClick={() => setSelectedIds(new Set())}
                  >
                    Clear
                  </button>
                </span>
              ) : (
                'Select templates to add'
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selectedIds.size === 0 || addMutation.isPending}
                onClick={handleConfirm}
              >
                {addMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-1" />
                    Add {selectedIds.size} Tasks
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
