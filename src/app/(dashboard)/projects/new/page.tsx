'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Globe,
  Layers,
  Globe2,
  Search,
  PenTool,
  Share2,
  Target,
  Mail,
  Palette,
  MousePointerClick,
  BarChart3,
  Lightbulb,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import type { ProjectType, ServiceType } from '@/types/enums'
import { SERVICE_TYPE_LABELS } from '@/types/enums'
import { cn } from '@/lib/utils'

export default function NewProjectPage() {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('full_service')
  const [brandId, setBrandId] = useState('')
  const [description, setDescription] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [selectedServices, setSelectedServices] = useState<Set<ServiceType>>(new Set())

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: serviceSummaries } = trpc.taskLibrary.getServiceSummaries.useQuery()

  const createMutation = trpc.project.create.useMutation({
    onSuccess: (data) => {
      utils.project.list.invalidate()
      toast.success('Project created')
      // If services selected, redirect with setupTasks params
      if (selectedServices.size > 0) {
        const servicesParam = Array.from(selectedServices).join(',')
        router.push(`/projects/${data?.id}?tab=tasks&setupTasks=true&services=${servicesParam}`)
      } else {
        router.push(`/projects/${data?.id}`)
      }
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleService = (service: ServiceType) => {
    setSelectedServices((prev) => {
      const next = new Set(prev)
      if (next.has(service)) next.delete(service)
      else next.add(service)
      return next
    })
  }

  const summaryMap = new Map(
    (serviceSummaries ?? []).map((s) => [s.serviceType, s])
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !brandId) return

    createMutation.mutate({
      name,
      type,
      brandId,
      description: description || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  return (
    <>
      <TopBar title="New Project" />
      <div className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Create Project</h2>
          <p className="text-muted-foreground">
            Start a new content, web build, or full service project
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
          {/* Project Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Project Type</CardTitle>
              <CardDescription>Choose the type of project</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'content_ops' as const, label: 'Content Ops', desc: 'Social media & content', icon: FileText },
                  { value: 'web_build' as const, label: 'Web Build', desc: 'Design & development', icon: Globe },
                  { value: 'full_service' as const, label: 'Full Service', desc: 'Content + web combined', icon: Layers },
                ]).map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors ${
                      type === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                    <div className="text-center">
                      <p className="text-sm font-semibold">{label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Project Details */}
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands?.map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Q1 Social Media Campaign"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the project..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Service Templates</CardTitle>
              <CardDescription>
                Select services to pre-populate tasks from the template library. You can customize after creation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {SERVICE_TEMPLATE_CARDS.map(({ service, icon: Icon }) => {
                  const summary = summaryMap.get(service)
                  const isSelected = selectedServices.has(service)
                  return (
                    <button
                      key={service}
                      type="button"
                      onClick={() => toggleService(service)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-lg border-2 p-3 transition-colors text-center',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <div>
                        <p className="text-xs font-semibold">
                          {SERVICE_TYPE_LABELS[service]}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {summary?.taskCount ?? 0} tasks
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
              {selectedServices.size > 0 && (
                <p className="text-xs text-muted-foreground mt-3">
                  {selectedServices.size} service{selectedServices.size > 1 ? 's' : ''} selected — task selection drawer will open after creation
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" disabled={createMutation.isPending || !brandId}>
              {createMutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

const SERVICE_TEMPLATE_CARDS: { service: ServiceType; icon: React.ComponentType<{ className?: string }> }[] = [
  { service: 'website', icon: Globe2 },
  { service: 'seo', icon: Search },
  { service: 'content', icon: PenTool },
  { service: 'social', icon: Share2 },
  { service: 'paid_ads', icon: Target },
  { service: 'email', icon: Mail },
  { service: 'branding', icon: Palette },
  { service: 'cro', icon: MousePointerClick },
  { service: 'analytics', icon: BarChart3 },
  { service: 'strategy', icon: Lightbulb },
]
