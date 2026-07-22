'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Plus,
  Search,
  Palette,
  FolderKanban,
  CheckSquare,
  Users,
  MoreHorizontal,
  Pencil,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  Layers,
  ListChecks,
  ExternalLink,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useDebounce } from '@/hooks/use-debounce'
import { PLATFORM_LABELS } from '@/lib/constants'
import { toast } from 'sonner'
import type { ContentPlatform } from '@/types/enums'

// ─── Platform colors ──────────────────────────────────
const PLATFORM_COLORS: Record<string, string> = {
  instagram: '#E1306C',
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  linkedin: '#0A66C2',
  tiktok: '#000000',
  youtube: '#FF0000',
  blog: '#F59E0B',
  newsletter: '#8B5CF6',
  other: '#6B7280',
}

// ─── Avatar fallback colors ──────────────────────────
const AVATAR_COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500',
  'bg-violet-500', 'bg-purple-500', 'bg-pink-500', 'bg-rose-500',
]

function getAvatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Sort type ────────────────────────────────────────
type SortOption = 'name' | 'updated' | 'projects' | 'tasks'

// ─── Default empty stats ─────────────────────────────
const EMPTY_STATS = {
  brandId: '',
  projectCount: 0,
  activeProjectCount: 0,
  taskCount: 0,
  completedTaskCount: 0,
  teamMemberCount: 0,
}

// ─── All platform keys for filter ─────────────────────
const ALL_PLATFORMS: ContentPlatform[] = [
  'instagram', 'facebook', 'twitter', 'linkedin',
  'tiktok', 'youtube', 'blog', 'newsletter', 'other',
]

export default function BrandsPage() {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const debouncedSearch = useDebounce(search, 300)

  // ─── Two parallel queries ───────────────────────────
  const { data: brands, isLoading: brandsLoading } = trpc.brand.list.useQuery({
    search: debouncedSearch || undefined,
    includeArchived: true,
  })

  const { data: stats, isLoading: statsLoading } = trpc.brand.listWithStats.useQuery()

  const isLoading = brandsLoading || statsLoading

  // ─── Mutations ──────────────────────────────────────
  const archiveMutation = trpc.brand.delete.useMutation({
    onSuccess: () => {
      utils.brand.list.invalidate()
      utils.brand.listWithStats.invalidate()
      toast.success('Brand archived')
    },
    onError: (err) => toast.error(err.message),
  })

  const restoreMutation = trpc.brand.restore.useMutation({
    onSuccess: () => {
      utils.brand.list.invalidate()
      utils.brand.listWithStats.invalidate()
      toast.success('Brand restored')
    },
    onError: (err) => toast.error(err.message),
  })

  // ─── Merge stats into brands ────────────────────────
  const statsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof stats>[number]>()
    for (const s of stats ?? []) map.set(s.brandId, s)
    return map
  }, [stats])

  const enrichedBrands = useMemo(() => {
    if (!brands) return []

    // 1. Merge stats
    let merged = brands.map((brand) => ({
      ...brand,
      stats: statsMap.get(brand.id) ?? { ...EMPTY_STATS, brandId: brand.id },
    }))

    // 2. Filter by status
    if (statusFilter === 'active') {
      merged = merged.filter((b) => b.is_active)
    } else if (statusFilter === 'archived') {
      merged = merged.filter((b) => !b.is_active)
    }

    // 3. Filter by platform
    if (platformFilter !== 'all') {
      merged = merged.filter((b) =>
        (b.platforms as ContentPlatform[] | null)?.includes(platformFilter as ContentPlatform)
      )
    }

    // 4. Sort
    switch (sortBy) {
      case 'updated':
        return [...merged].sort((a, b) =>
          (b.updated_at ?? b.created_at).localeCompare(a.updated_at ?? a.created_at)
        )
      case 'projects':
        return [...merged].sort((a, b) =>
          b.stats.projectCount - a.stats.projectCount
        )
      case 'tasks':
        return [...merged].sort((a, b) =>
          b.stats.taskCount - a.stats.taskCount
        )
      case 'name':
      default:
        return merged // already sorted by name from query
    }
  }, [brands, statsMap, statusFilter, platformFilter, sortBy])

  // ─── Summary stats ─────────────────────────────────
  const summary = useMemo(() => {
    if (!brands || !stats) return { totalBrands: 0, activeProjects: 0, totalTasks: 0, teamMembers: 0 }

    return {
      totalBrands: brands.filter((b) => b.is_active).length,
      activeProjects: (stats ?? []).reduce((sum, s) => sum + s.activeProjectCount, 0),
      totalTasks: (stats ?? []).reduce((sum, s) => sum + s.taskCount, 0),
      teamMembers: (stats ?? []).reduce((sum, s) => sum + s.teamMemberCount, 0),
    }
  }, [brands, stats])

  return (
    <TooltipProvider>
      <TopBar title="Brands" />
      <div className="flex flex-col gap-6 p-6">
        {/* ─── Header ─── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Brands</h2>
            <p className="text-muted-foreground">
              Manage your client brands, guidelines, and content
            </p>
          </div>
          <Button asChild>
            <Link href="/brands/new">
              <Plus className="mr-2 h-4 w-4" />
              New Brand
            </Link>
          </Button>
        </div>

        {/* ─── Summary Stats ─── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                  <Layers className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalBrands}</p>
                  <p className="text-xs text-muted-foreground">Total Brands</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50">
                  <FolderKanban className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.activeProjects}</p>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                  <ListChecks className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.totalTasks}</p>
                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                  <Users className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.teamMembers}</p>
                  <p className="text-xs text-muted-foreground">Team Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Filters + Sort ─── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {ALL_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-48">
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="updated">Recently Updated</SelectItem>
              <SelectItem value="projects">Most Projects</SelectItem>
              <SelectItem value="tasks">Most Tasks</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ─── Brand Cards ─── */}
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 w-32 rounded bg-muted" />
                      <div className="h-4 w-48 rounded bg-muted" />
                    </div>
                  </div>
                  <div className="mt-4 flex gap-4">
                    <div className="h-4 w-12 rounded bg-muted" />
                    <div className="h-4 w-12 rounded bg-muted" />
                    <div className="h-4 w-12 rounded bg-muted" />
                  </div>
                  <div className="mt-3 flex gap-1.5">
                    <div className="h-5 w-20 rounded-full bg-muted" />
                    <div className="h-5 w-16 rounded-full bg-muted" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : enrichedBrands.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {enrichedBrands.map((brand) => {
              const platforms = (brand.platforms ?? []) as ContentPlatform[]
              const guidelines = brand.guidelines as Record<string, unknown> | null

              return (
                <Card
                  key={brand.id}
                  className={`group relative transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
                    !brand.is_active ? 'opacity-60' : ''
                  }`}
                >
                  <CardContent className="p-5">
                    {/* Row 1: Avatar + Name + Description + Menu */}
                    <div className="flex items-start gap-4">
                      <Link href={`/brands/${brand.id}`} className="shrink-0">
                        {brand.logo_url ? (
                          <img
                            src={brand.logo_url}
                            alt={brand.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div
                            className={`flex h-12 w-12 items-center justify-center rounded-lg text-white font-semibold text-lg ${getAvatarColor(brand.name)}`}
                          >
                            {brand.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <Link href={`/brands/${brand.id}`} className="min-w-0">
                            <h3 className="font-semibold truncate hover:text-primary transition-colors">
                              {brand.name}
                            </h3>
                          </Link>

                          {/* Three-dot menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/brands/${brand.id}/edit`)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Brand
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => router.push(`/brands/${brand.id}`)}
                              >
                                <FolderKanban className="mr-2 h-4 w-4" />
                                View Projects
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {brand.is_active ? (
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => archiveMutation.mutate({ id: brand.id })}
                                >
                                  <Archive className="mr-2 h-4 w-4" />
                                  Archive Brand
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => restoreMutation.mutate({ id: brand.id })}
                                >
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Restore Brand
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {brand.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {brand.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Metrics */}
                    <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1.5">
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">
                              {brand.stats.projectCount}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {brand.stats.projectCount} project{brand.stats.projectCount !== 1 ? 's' : ''} ({brand.stats.activeProjectCount} active)
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1.5">
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">
                              {brand.stats.taskCount}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {brand.stats.completedTaskCount}/{brand.stats.taskCount} tasks completed
                          </p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span className="font-medium text-foreground">
                              {brand.stats.teamMemberCount}
                            </span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {brand.stats.teamMemberCount} team member{brand.stats.teamMemberCount !== 1 ? 's' : ''}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* Row 3: Platform badges */}
                    {platforms.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {platforms.map((p) => (
                          <Badge
                            key={p}
                            variant="secondary"
                            className="text-xs gap-1.5"
                          >
                            <span
                              className="inline-block h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: PLATFORM_COLORS[p] ?? '#6B7280' }}
                            />
                            {PLATFORM_LABELS[p] || p}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Row 4: Website / Guidelines */}
                    {(brand.website_url || (guidelines && Object.keys(guidelines).length > 0)) && (
                      <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                        {brand.website_url && (
                          <span className="flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            Website
                          </span>
                        )}
                        {guidelines && Object.keys(guidelines).length > 0 && (
                          <span className="flex items-center gap-1">
                            <Palette className="h-3 w-3" />
                            Guidelines
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          /* ─── Empty State ─── */
          <div className="flex items-center justify-center rounded-xl border border-dashed p-16">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No brands yet</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-sm mx-auto">
                Add your first brand to start managing content, projects, and campaigns for your clients.
              </p>
              <Button asChild className="mt-4">
                <Link href="/brands/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Brand
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}
