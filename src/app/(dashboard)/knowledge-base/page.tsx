'use client'

import { useState, useCallback } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Brain, Search, Plus } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { KBDocumentList } from '@/components/knowledge-base/kb-document-list'
import { KBStatsBar } from '@/components/knowledge-base/kb-stats-bar'
import { KBDropZone } from '@/components/knowledge-base/kb-drop-zone'
import { KBAsk } from '@/components/knowledge-base/kb-ask'
import { KBSuggestedUploads } from '@/components/knowledge-base/kb-suggested-uploads'
import { KBUploadDialog } from '@/components/knowledge-base/kb-upload-dialog'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'marketing_strategy', label: 'Marketing Strategy' },
  { value: 'campaign_history', label: 'Campaign History' },
  { value: 'seo_research', label: 'SEO Research' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'customer_personas', label: 'Customer Personas' },
  { value: 'sop', label: 'SOPs / Processes' },
]

const SCOPE_OPTIONS = [
  { value: 'all', label: 'All Scopes' },
  { value: 'agency', label: 'Agency-wide' },
  { value: 'brand', label: 'Brand-specific' },
  { value: 'project', label: 'Project-specific' },
]

export default function KnowledgeBasePage() {
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(undefined)
  const [category, setCategory] = useState('all')
  const [scope, setScope] = useState('all')
  const [search, setSearch] = useState('')
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [droppedFile, setDroppedFile] = useState<File | null>(null)
  const [uploadDefaults, setUploadDefaults] = useState<{
    tab?: 'file' | 'text' | 'url' | 'persona' | 'strategy' | 'competitor' | 'campaign' | 'sop'
    category?: string
    sourceType?: string
    title?: string
  }>({})

  const { data: brands } = trpc.brand.list.useQuery()
  const { data: docs } = trpc.knowledgeBase.list.useQuery({
    brandId: selectedBrandId,
  })

  const handleFileDrop = useCallback((file: File) => {
    setDroppedFile(file)
    setUploadDefaults({ tab: 'file' })
    setUploadDialogOpen(true)
  }, [])

  const handleSuggestionClick = useCallback(
    (suggestion: { title: string; category: string; sourceType: string }) => {
      const tabMap: Record<string, 'text' | 'persona' | 'strategy' | 'competitor' | 'campaign' | 'sop'> = {
        brand_guidelines: 'text',
        sop: 'sop',
        customer_personas: 'persona',
        marketing_strategy: 'strategy',
        competitor_analysis: 'competitor',
        campaign_history: 'campaign',
      }
      setUploadDefaults({
        tab: tabMap[suggestion.sourceType] ?? 'text',
        category: suggestion.category,
        sourceType: suggestion.sourceType,
        title: suggestion.title,
      })
      setDroppedFile(null)
      setUploadDialogOpen(true)
    },
    []
  )

  const handleAddKnowledge = useCallback(() => {
    setUploadDefaults({})
    setDroppedFile(null)
    setUploadDialogOpen(true)
  }, [])

  return (
    <>
      <TopBar title="Agency Intelligence Hub" />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-purple-100 p-2.5 dark:bg-purple-900">
              <Brain className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Agency Intelligence Hub
              </h2>
              <p className="text-muted-foreground">
                Everything your AI agents read. Agency-wide knowledge applies to
                every client; brand and project knowledge stays with its own.
              </p>
            </div>
          </div>
          <Button onClick={handleAddKnowledge} size="lg">
            <Plus className="mr-2 h-4 w-4" />
            Add Knowledge
          </Button>
        </div>

        {/* Stats Bar */}
        <KBStatsBar brandId={selectedBrandId} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={scope}
            onValueChange={setScope}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={selectedBrandId ?? 'all'}
            onValueChange={(v) => setSelectedBrandId(v === 'all' ? undefined : v)}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All Brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search knowledge..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Ask Knowledge Base */}
        <KBAsk brandId={selectedBrandId} />

        {/* Suggested Uploads (shown when brand has < 3 docs) */}
        <KBSuggestedUploads
          onSuggestionClick={handleSuggestionClick}
          documentCount={docs?.length ?? 0}
        />

        {/* Drop Zone wrapping Document Grid */}
        <KBDropZone onFileDrop={handleFileDrop}>
          <KBDocumentList
            brandId={selectedBrandId}
            category={category}
            knowledgeScope={scope}
            search={search}
          />
        </KBDropZone>
      </div>

      {/* Upload Dialog (controlled) */}
      <KBUploadDialog
        brandId={selectedBrandId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        preDroppedFile={droppedFile}
        defaultTab={uploadDefaults.tab}
        defaultCategory={uploadDefaults.category}
        defaultSourceType={uploadDefaults.sourceType}
        defaultTitle={uploadDefaults.title}
        trigger={<span />}
      />
    </>
  )
}
