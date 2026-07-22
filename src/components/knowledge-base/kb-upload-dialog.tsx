'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Plus,
  Upload,
  FileText,
  Link,
  Users,
  Target,
  Swords,
  Megaphone,
  ClipboardList,
  Loader2,
  Sparkles,
  Globe,
  Type,
  AlertCircle,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useFileUpload } from '@/hooks/use-file-upload'
import { toast } from 'sonner'
import { PersonaForm } from './forms/persona-form'
import { StrategyForm } from './forms/strategy-form'
import { CompetitorForm } from './forms/competitor-form'
import { CampaignForm } from './forms/campaign-form'
import { SOPForm } from './forms/sop-form'
import {
  EMPTY_PERSONA,
  EMPTY_STRATEGY,
  EMPTY_COMPETITOR,
  EMPTY_CAMPAIGN,
  EMPTY_SOP,
  CONTENT_TYPE_CATEGORY,
  type PersonaData,
  type StrategyData,
  type CompetitorData,
  type CampaignData,
  type SOPData,
  type KBContentType,
} from '@/types/kb-forms'

const ACCEPTED_FILE_TYPES = '.pdf,.txt,.md,.csv'
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
]

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'General' },
  { value: 'brand_guidelines', label: 'Brand Guidelines' },
  { value: 'marketing_strategy', label: 'Marketing Strategy' },
  { value: 'campaign_history', label: 'Campaign History' },
  { value: 'seo_research', label: 'SEO Research' },
  { value: 'competitor_analysis', label: 'Competitor Analysis' },
  { value: 'customer_personas', label: 'Customer Personas' },
  { value: 'sop', label: 'SOPs / Processes' },
]

type TabValue =
  | 'file'
  | 'text'
  | 'url'
  | 'persona'
  | 'strategy'
  | 'competitor'
  | 'campaign'
  | 'sop'

type KnowledgeScope = 'agency' | 'brand' | 'project'

interface KBUploadDialogProps {
  brandId?: string
  trigger?: React.ReactNode
  defaultTab?: TabValue
  defaultCategory?: string
  defaultSourceType?: string
  defaultTitle?: string
  preDroppedFile?: File | null
  onOpenChange?: (open: boolean) => void
  open?: boolean
}

export function KBUploadDialog({
  brandId,
  trigger,
  defaultTab,
  defaultCategory,
  defaultSourceType,
  defaultTitle,
  preDroppedFile,
  onOpenChange,
  open: controlledOpen,
}: KBUploadDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const [tab, setTab] = useState<TabValue>(defaultTab ?? 'file')
  const [category, setCategory] = useState(defaultCategory ?? 'general')
  const [scope, setScope] = useState<KnowledgeScope>('brand')
  const [selectedBrandId, setSelectedBrandId] = useState<string | undefined>(brandId)

  const { data: brands } = trpc.brand.list.useQuery()

  // Sync brandId prop when dialog opens
  useEffect(() => {
    if (open && brandId) setSelectedBrandId(brandId)
  }, [open, brandId])

  // File upload state
  const [fileTitle, setFileTitle] = useState(defaultTitle ?? '')
  const [fileDescription, setFileDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(preDroppedFile ?? null)

  // Text state
  const [textTitle, setTextTitle] = useState('')
  const [textDescription, setTextDescription] = useState('')
  const [pastedText, setPastedText] = useState('')

  // URL state
  const [urlTitle, setUrlTitle] = useState('')
  const [urlDescription, setUrlDescription] = useState('')
  const [url, setUrl] = useState('')

  // Structured form state
  const [personaData, setPersonaData] = useState<PersonaData>({ ...EMPTY_PERSONA })
  const [strategyData, setStrategyData] = useState<StrategyData>({ ...EMPTY_STRATEGY })
  const [competitorData, setCompetitorData] = useState<CompetitorData>({ ...EMPTY_COMPETITOR })
  const [campaignData, setCampaignData] = useState<CampaignData>({ ...EMPTY_CAMPAIGN })
  const [sopData, setSopData] = useState<SOPData>({ ...EMPTY_SOP })

  // Structured form title/description
  const [structuredTitle, setStructuredTitle] = useState('')
  const [structuredDescription, setStructuredDescription] = useState('')

  // Auto-fill state
  const [aiFilled, setAiFilled] = useState<Set<string>>(new Set())
  const [autoFillLoading, setAutoFillLoading] = useState(false)
  const [autoFillSource, setAutoFillSource] = useState<string | null>(null)
  const [autoFillSourceUrl, setAutoFillSourceUrl] = useState<string | null>(null)

  const utils = trpc.useUtils()
  const { upload, uploading } = useFileUpload()

  // Handle defaults when dialog opens
  useEffect(() => {
    if (open) {
      if (defaultTab) setTab(defaultTab)
      if (defaultCategory) setCategory(defaultCategory)
      if (defaultTitle) {
        if (defaultTab === 'text') setTextTitle(defaultTitle)
        else if (defaultTab && ['persona', 'strategy', 'competitor', 'campaign', 'sop'].includes(defaultTab)) {
          setStructuredTitle(defaultTitle)
        } else setFileTitle(defaultTitle)
      }
    }
  }, [open, defaultTab, defaultCategory, defaultTitle])

  // Handle pre-dropped files
  useEffect(() => {
    if (preDroppedFile && open) {
      setSelectedFile(preDroppedFile)
      setTab('file')
      if (!fileTitle) {
        setFileTitle(preDroppedFile.name.replace(/\.[^.]+$/, ''))
      }
    }
  }, [preDroppedFile, open, fileTitle])

  const uploadMutation = trpc.knowledgeBase.upload.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getStats.invalidate()
      toast.success('Document uploaded and processing')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const createFromTextMutation = trpc.knowledgeBase.createFromText.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getStats.invalidate()
      toast.success('Knowledge added successfully')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const importFromUrlMutation = trpc.knowledgeBase.importFromUrl.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getStats.invalidate()
      toast.success('URL content imported and indexing')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  const createStructuredMutation = trpc.knowledgeBase.createStructured.useMutation({
    onSuccess: () => {
      utils.knowledgeBase.list.invalidate()
      utils.knowledgeBase.getStats.invalidate()
      toast.success('Knowledge added successfully')
      resetAndClose()
    },
    onError: (err) => toast.error(err.message),
  })

  function resetAndClose() {
    setFileTitle('')
    setFileDescription('')
    setSelectedFile(null)
    setTextTitle('')
    setTextDescription('')
    setPastedText('')
    setUrlTitle('')
    setUrlDescription('')
    setUrl('')
    setStructuredTitle('')
    setStructuredDescription('')
    setPersonaData({ ...EMPTY_PERSONA })
    setStrategyData({ ...EMPTY_STRATEGY })
    setCompetitorData({ ...EMPTY_COMPETITOR })
    setCampaignData({ ...EMPTY_CAMPAIGN })
    setSopData({ ...EMPTY_SOP })
    setAiFilled(new Set())
    setAutoFillLoading(false)
    setAutoFillSource(null)
    setAutoFillSourceUrl(null)
    setCategory('general')
    setScope('brand')
    setSelectedBrandId(brandId)
    setOpen(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      toast.error('Unsupported file type. Please upload PDF, TXT, MD, or CSV.')
      return
    }
    setSelectedFile(file)
    if (!fileTitle) setFileTitle(file.name.replace(/\.[^.]+$/, ''))
  }

  async function handleFileUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !fileTitle) return
    try {
      const fileUrl = await upload(selectedFile, { folder: 'knowledge-base' })
      uploadMutation.mutate({
        brandId: selectedBrandId,
        title: fileTitle,
        description: fileDescription || undefined,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        category: category as any,
        knowledgeScope: scope,
      })
    } catch {
      toast.error('File upload failed')
    }
  }

  function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!textTitle || !pastedText.trim()) return
    createFromTextMutation.mutate({
      brandId: selectedBrandId,
      title: textTitle,
      description: textDescription || undefined,
      text: pastedText,
      sourceType: 'text_note',
      category: category as any,
      knowledgeScope: scope,
    })
  }

  function handleUrlImport(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    importFromUrlMutation.mutate({
      brandId: selectedBrandId,
      title: urlTitle || 'Imported URL',
      description: urlDescription || undefined,
      url,
      category: category as any,
      knowledgeScope: scope,
    })
  }

  function handleStructuredSubmit(contentType: KBContentType, data: Record<string, unknown>) {
    const autoTitle = getAutoTitle(contentType, data)
    const title = structuredTitle || autoTitle
    if (!title) {
      toast.error('Please provide a title')
      return
    }

    createStructuredMutation.mutate({
      brandId: selectedBrandId,
      title,
      description: structuredDescription || undefined,
      contentType,
      structuredData: data,
      category: CONTENT_TYPE_CATEGORY[contentType] as any,
      knowledgeScope: scope,
      autoFillSource: autoFillSource || undefined,
      autoFillSourceUrl: autoFillSourceUrl || undefined,
    })
  }

  // ── Auto-fill handler ──────────────────────────────────────────
  const handleAutoFill = useCallback(async (
    contentType: KBContentType,
    sourceType: 'file' | 'url' | 'text',
    content: string,
  ) => {
    setAutoFillLoading(true)
    try {
      const resp = await fetch('/api/knowledge-base/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, source: { type: sourceType, content } }),
      })
      if (!resp.ok) throw new Error('Auto-fill failed')
      const { data, confidence } = await resp.json() as {
        data: Record<string, unknown>
        confidence: Record<string, string>
      }

      // Track which fields were AI-filled
      const filledFields = new Set<string>()
      for (const [key, val] of Object.entries(data)) {
        if (val !== null && val !== undefined) {
          const conf = confidence[key]
          if (conf !== 'low') filledFields.add(key)
        }
      }
      setAiFilled(filledFields)

      // Track source for audit
      if (sourceType === 'url') {
        setAutoFillSource(content.includes('linkedin.com') ? 'linkedin' : 'url')
        setAutoFillSourceUrl(content)
      } else {
        setAutoFillSource(sourceType)
        setAutoFillSourceUrl(null)
      }

      // Merge AI-extracted data into the correct form state
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function mergeInto(current: any, partial: Record<string, unknown>): any {
        const merged = { ...current }
        for (const [key, val] of Object.entries(partial)) {
          if (val !== null && val !== undefined && key in merged) {
            merged[key] = val
          }
        }
        return merged
      }

      switch (contentType) {
        case 'persona': setPersonaData(mergeInto(personaData, data)); break
        case 'strategy': setStrategyData(mergeInto(strategyData, data)); break
        case 'competitor': setCompetitorData(mergeInto(competitorData, data)); break
        case 'campaign': setCampaignData(mergeInto(campaignData, data)); break
        case 'sop': setSopData(mergeInto(sopData, data)); break
      }

      toast.success(`AI filled ${filledFields.size} fields. Review and confirm before saving.`)
    } catch (err) {
      console.error('[auto-fill]', err)
      toast.error('Auto-fill failed. Please try again or fill in manually.')
    } finally {
      setAutoFillLoading(false)
    }
  }, [personaData, strategyData, competitorData, campaignData, sopData])

  // Clear AI-filled indicator when user edits a field
  const clearAiFilled = useCallback((field: string) => {
    setAiFilled(prev => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }, [])

  // ── Auto-fill popover component ───────────────────────────────
  const AutoFillPopover = ({ contentType }: { contentType: KBContentType }) => {
    const [sourceType, setSourceType] = useState<'file' | 'url' | 'text'>('url')
    const [inputValue, setInputValue] = useState('')

    async function handleExtract() {
      if (!inputValue.trim()) return
      await handleAutoFill(contentType, sourceType, inputValue)
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={autoFillLoading}
            className="h-7 text-xs gap-1.5"
          >
            {autoFillLoading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Extracting...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" />Auto-fill from document</>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-3">
            <p className="text-xs font-medium">Extract data from a source</p>
            <div className="flex gap-1">
              {([
                { type: 'url' as const, icon: Globe, label: 'URL' },
                { type: 'text' as const, icon: Type, label: 'Text' },
                { type: 'file' as const, icon: Upload, label: 'File' },
              ]).map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  type="button"
                  variant={sourceType === type ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs flex-1"
                  onClick={() => { setSourceType(type); setInputValue('') }}
                >
                  <Icon className="mr-1 h-3 w-3" />{label}
                </Button>
              ))}
            </div>
            {sourceType === 'url' && (
              <div className="space-y-1.5">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="https://example.com or LinkedIn URL"
                  className="text-xs h-8"
                />
                {contentType === 'competitor' && (
                  <p className="text-[10px] text-muted-foreground">
                    Tip: Paste a LinkedIn company page URL for competitor data
                  </p>
                )}
              </div>
            )}
            {sourceType === 'text' && (
              <Textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste document content here..."
                rows={4}
                className="text-xs"
              />
            )}
            {sourceType === 'file' && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Upload a PDF or DOCX — AI will extract structured fields
                </p>
                <Input
                  type="file"
                  accept=".pdf,.docx"
                  className="text-xs h-8"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => {
                      const base64 = (reader.result as string).split(',')[1] || ''
                      setInputValue(base64)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
              </div>
            )}
            <Button
              type="button"
              className="w-full h-8 text-xs"
              disabled={!inputValue.trim() || autoFillLoading}
              onClick={handleExtract}
            >
              {autoFillLoading ? (
                <><Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />Extracting...</>
              ) : (
                <><Sparkles className="mr-1 h-3.5 w-3.5" />Extract with AI</>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  // ── AI-filled banner ──────────────────────────────────────────
  const AiFilledBanner = () => {
    if (aiFilled.size === 0) return null
    return (
      <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-700">
          AI filled <strong>{aiFilled.size}</strong> fields. Review and confirm before saving.
        </p>
      </div>
    )
  }

  function getAutoTitle(contentType: KBContentType, data: Record<string, unknown>): string {
    const d = data as Record<string, string>
    switch (contentType) {
      case 'persona': return `${d.personaName || 'Untitled'} — Persona`
      case 'strategy': return `${d.targetAudience || d.objectiveType || 'Untitled'} — Strategy`
      case 'competitor': return `${d.companyName || 'Untitled'} — Competitor`
      case 'campaign': return `${d.campaignName || 'Untitled'} — Campaign`
      case 'sop': return `${d.processName || 'Untitled'} — SOP`
    }
  }

  const isProcessing =
    uploading ||
    uploadMutation.isPending ||
    createFromTextMutation.isPending ||
    importFromUrlMutation.isPending ||
    createStructuredMutation.isPending

  // Auto-set category when switching to a structured tab
  useEffect(() => {
    const structuredTabs: KBContentType[] = ['persona', 'strategy', 'competitor', 'campaign', 'sop']
    if (structuredTabs.includes(tab as KBContentType)) {
      setCategory(CONTENT_TYPE_CATEGORY[tab as KBContentType])
    }
  }, [tab])

  // Shared category + scope + brand controls
  const SharedFields = ({ hideCategory }: { hideCategory?: boolean }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {!hideCategory && (
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs">
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
          </div>
        )}
        <div className={hideCategory ? 'col-span-2 space-y-1.5' : 'space-y-1.5'}>
          <Label className="text-xs">Assign to Brand</Label>
          <Select
            value={selectedBrandId ?? '_none'}
            onValueChange={(v) => setSelectedBrandId(v === '_none' ? undefined : v)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="No brand (agency-wide)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">No brand (agency-wide)</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Scope</Label>
        <RadioGroup
          value={scope}
          onValueChange={(v) => setScope(v as KnowledgeScope)}
          className="flex gap-3 pt-1"
        >
          <div className="flex items-center gap-1">
            <RadioGroupItem value="agency" id="scope-agency" className="h-3.5 w-3.5" />
            <Label htmlFor="scope-agency" className="text-xs font-normal cursor-pointer">
              Agency
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="brand" id="scope-brand" className="h-3.5 w-3.5" />
            <Label htmlFor="scope-brand" className="text-xs font-normal cursor-pointer">
              Brand
            </Label>
          </div>
          <div className="flex items-center gap-1">
            <RadioGroupItem value="project" id="scope-project" className="h-3.5 w-3.5" />
            <Label htmlFor="scope-project" className="text-xs font-normal cursor-pointer">
              Project
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  )

  // Shared title + description for structured forms
  const StructuredTitleFields = () => (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Title (auto-generated if blank)</Label>
        <Input
          value={structuredTitle}
          onChange={(e) => setStructuredTitle(e.target.value)}
          placeholder="Leave blank for auto-title"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Description (optional)</Label>
        <Input
          value={structuredDescription}
          onChange={(e) => setStructuredDescription(e.target.value)}
          placeholder="Brief description"
        />
      </div>
    </div>
  )

  const TAB_CONFIG: { value: TabValue; icon: React.ElementType; label: string }[] = [
    { value: 'file', icon: Upload, label: 'Upload File' },
    { value: 'text', icon: FileText, label: 'Paste Text' },
    { value: 'url', icon: Link, label: 'Import URL' },
    { value: 'persona', icon: Users, label: 'Customer Persona' },
    { value: 'strategy', icon: Target, label: 'Strategy' },
    { value: 'competitor', icon: Swords, label: 'Competitor' },
    { value: 'campaign', icon: Megaphone, label: 'Campaign' },
    { value: 'sop', icon: ClipboardList, label: 'SOP / Process' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Knowledge
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Knowledge for AI Agents</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)}>
          <TooltipProvider delayDuration={200}>
            <TabsList className="grid w-full grid-cols-4 h-auto gap-0">
              {TAB_CONFIG.slice(0, 4).map(({ value, icon: Icon, label }) => (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <TabsTrigger value={value} className="w-full py-2">
                        <Icon className="h-4 w-4" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
            <TabsList className="grid w-full grid-cols-4 h-auto gap-0 mt-1">
              {TAB_CONFIG.slice(4).map(({ value, icon: Icon, label }) => (
                <Tooltip key={value}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <TabsTrigger value={value} className="w-full py-2">
                        <Icon className="h-4 w-4" />
                      </TabsTrigger>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TabsList>
          </TooltipProvider>

          {/* ── Upload File ──────────────────────────── */}
          <TabsContent value="file">
            <form onSubmit={handleFileUpload} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="Brief description of this document"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>File</Label>
                <Input
                  type="file"
                  accept={ACCEPTED_FILE_TYPES}
                  onChange={handleFileChange}
                  required={!selectedFile}
                />
                {selectedFile && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </p>
                )}
              </div>
              <SharedFields />
              <Button type="submit" disabled={isProcessing || !selectedFile} className="w-full">
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                ) : uploadMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                ) : (
                  'Upload & Index'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* ── Paste Text ──────────────────────────── */}
          <TabsContent value="text">
            <form onSubmit={handleTextSubmit} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Document title"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  value={textDescription}
                  onChange={(e) => setTextDescription(e.target.value)}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Content</Label>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your text content here..."
                  rows={6}
                  required
                />
                {pastedText && (
                  <p className="text-xs text-muted-foreground">
                    {pastedText.split(/\s+/).filter(Boolean).length} words
                  </p>
                )}
              </div>
              <SharedFields />
              <Button
                type="submit"
                disabled={isProcessing || !pastedText.trim()}
                className="w-full"
              >
                {createFromTextMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
                ) : (
                  'Add to Knowledge Base'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* ── Import URL ──────────────────────────── */}
          <TabsContent value="url">
            <form onSubmit={handleUrlImport} className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  type="url"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Title (optional — auto-detected from page)</Label>
                <Input
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="Leave blank to use page title"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  value={urlDescription}
                  onChange={(e) => setUrlDescription(e.target.value)}
                  placeholder="Brief description"
                  rows={2}
                />
              </div>
              <SharedFields />
              <Button
                type="submit"
                disabled={isProcessing || !url.trim()}
                className="w-full"
              >
                {importFromUrlMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importing...</>
                ) : (
                  'Import & Index'
                )}
              </Button>
            </form>
          </TabsContent>

          {/* ── Persona ──────────────────────────── */}
          <TabsContent value="persona">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <StructuredTitleFields />
                <AutoFillPopover contentType="persona" />
              </div>
              <AiFilledBanner />
              <PersonaForm value={personaData} onChange={setPersonaData} />
              <SharedFields hideCategory />
              <Button
                type="button"
                disabled={isProcessing || !personaData.personaName.trim()}
                className="w-full"
                onClick={() => handleStructuredSubmit('persona', personaData as unknown as Record<string, unknown>)}
              >
                {createStructuredMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Persona'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── Strategy ──────────────────────────── */}
          <TabsContent value="strategy">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <StructuredTitleFields />
                <AutoFillPopover contentType="strategy" />
              </div>
              <AiFilledBanner />
              <StrategyForm value={strategyData} onChange={setStrategyData} />
              <SharedFields hideCategory />
              <Button
                type="button"
                disabled={isProcessing || !strategyData.targetAudience.trim()}
                className="w-full"
                onClick={() => handleStructuredSubmit('strategy', strategyData as unknown as Record<string, unknown>)}
              >
                {createStructuredMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Strategy'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── Competitor ──────────────────────────── */}
          <TabsContent value="competitor">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <StructuredTitleFields />
                <AutoFillPopover contentType="competitor" />
              </div>
              <AiFilledBanner />
              <CompetitorForm value={competitorData} onChange={setCompetitorData} />
              <SharedFields hideCategory />
              <Button
                type="button"
                disabled={isProcessing || !competitorData.companyName.trim()}
                className="w-full"
                onClick={() => handleStructuredSubmit('competitor', competitorData as unknown as Record<string, unknown>)}
              >
                {createStructuredMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Competitor'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── Campaign ──────────────────────────── */}
          <TabsContent value="campaign">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <StructuredTitleFields />
                <AutoFillPopover contentType="campaign" />
              </div>
              <AiFilledBanner />
              <CampaignForm value={campaignData} onChange={setCampaignData} />
              <SharedFields hideCategory />
              <Button
                type="button"
                disabled={isProcessing || !campaignData.campaignName.trim()}
                className="w-full"
                onClick={() => handleStructuredSubmit('campaign', campaignData as unknown as Record<string, unknown>)}
              >
                {createStructuredMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save Campaign'
                )}
              </Button>
            </div>
          </TabsContent>

          {/* ── SOP / Process ──────────────────────── */}
          <TabsContent value="sop">
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <StructuredTitleFields />
                <AutoFillPopover contentType="sop" />
              </div>
              <AiFilledBanner />
              <SOPForm value={sopData} onChange={setSopData} />
              <SharedFields hideCategory />
              <Button
                type="button"
                disabled={isProcessing || !sopData.processName.trim()}
                className="w-full"
                onClick={() => handleStructuredSubmit('sop', sopData as unknown as Record<string, unknown>)}
              >
                {createStructuredMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  'Save SOP'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
