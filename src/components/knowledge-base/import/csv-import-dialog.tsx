'use client'

import { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { CONTENT_TYPE_CATEGORY } from '@/types/kb-forms'
import type { KBContentType } from '@/types/kb-forms'
import { toast } from 'sonner'

// ---------------------------------------------------------------------------
// Schema field definitions
// ---------------------------------------------------------------------------

const PERSONA_FIELDS = [
  'personaName',
  'role',
  'demographics',
  'goals',
  'painPoints',
  'preferredChannels',
  'behaviorNotes',
  'quotes',
] as const

const COMPETITOR_FIELDS = [
  'companyName',
  'website',
  'industry',
  'strengths',
  'weaknesses',
  'channels',
  'positioning',
  'priceRange',
  'notes',
  'threatLevel',
] as const

const FIELD_LABELS: Record<string, string> = {
  personaName: 'Persona Name',
  role: 'Role / Job Title',
  demographics: 'Demographics',
  goals: 'Goals',
  painPoints: 'Pain Points',
  preferredChannels: 'Preferred Channels',
  behaviorNotes: 'Behavior Notes',
  quotes: 'Quotes',
  companyName: 'Company Name',
  website: 'Website',
  industry: 'Industry',
  strengths: 'Strengths',
  weaknesses: 'Weaknesses',
  channels: 'Channels',
  positioning: 'Positioning',
  priceRange: 'Price Range',
  notes: 'Notes',
  threatLevel: 'Threat Level',
}

// Array fields that should be split from CSV comma-separated values
const ARRAY_FIELDS = new Set([
  'goals',
  'painPoints',
  'preferredChannels',
  'quotes',
  'strengths',
  'weaknesses',
  'channels',
])

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = 'upload' | 'mapping' | 'review'

interface ParsedCSV {
  headers: string[]
  rows: Record<string, string>[]
  rowCount: number
  suggestedMappings: Record<string, string>
}

interface CsvImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contentType: 'persona' | 'competitor'
  brandId?: string
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CsvImportDialog({
  open,
  onOpenChange,
  contentType,
  brandId,
  onComplete,
}: CsvImportDialogProps) {
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedCSV | null>(null)
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [done, setDone] = useState(false)

  const fields =
    contentType === 'persona' ? PERSONA_FIELDS : COMPETITOR_FIELDS
  const createStructured = trpc.knowledgeBase.createStructured.useMutation()

  // -------------------------------------------------------------------------
  // Step 1: Upload & parse
  // -------------------------------------------------------------------------

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      if (!f.name.endsWith('.csv') && f.type !== 'text/csv') {
        toast.error('Please select a CSV file')
        return
      }
      setFile(f)
    },
    []
  )

  const handleUpload = useCallback(async () => {
    if (!file) return
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('contentType', contentType)
      if (brandId) formData.append('brandId', brandId)

      const res = await fetch('/api/knowledge-base/import-csv', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error || 'Failed to parse CSV'
        )
      }

      const data = (await res.json()) as ParsedCSV
      setParsed(data)
      setMappings(data.suggestedMappings)
      // Select all rows by default
      setSelectedRows(new Set(data.rows.map((_, i) => i)))
      setStep('mapping')
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to parse CSV'
      )
    } finally {
      setUploading(false)
    }
  }, [file, contentType, brandId])

  // -------------------------------------------------------------------------
  // Step 2: Column mapping
  // -------------------------------------------------------------------------

  const updateMapping = useCallback(
    (csvHeader: string, schemaField: string) => {
      setMappings(prev => {
        const next = { ...prev }
        if (schemaField === '__skip__') {
          delete next[csvHeader]
        } else {
          // Remove any existing header mapped to this field
          for (const key of Object.keys(next)) {
            if (next[key] === schemaField && key !== csvHeader) {
              delete next[key]
            }
          }
          next[csvHeader] = schemaField
        }
        return next
      })
    },
    []
  )

  // -------------------------------------------------------------------------
  // Step 3: Review & Import
  // -------------------------------------------------------------------------

  const toggleRow = useCallback((index: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const toggleAllRows = useCallback(() => {
    if (!parsed) return
    setSelectedRows(prev => {
      if (prev.size === parsed.rows.length) {
        return new Set()
      }
      return new Set(parsed.rows.map((_, i) => i))
    })
  }, [parsed])

  const buildStructuredData = useCallback(
    (row: Record<string, string>): Record<string, unknown> => {
      const data: Record<string, unknown> = {}

      for (const [csvHeader, schemaField] of Object.entries(mappings)) {
        const rawValue = row[csvHeader]?.trim() ?? ''
        if (!rawValue) continue

        if (ARRAY_FIELDS.has(schemaField)) {
          // Split comma or semicolon separated values
          data[schemaField] = rawValue
            .split(/[,;]/)
            .map(s => s.trim())
            .filter(Boolean)
        } else {
          data[schemaField] = rawValue
        }
      }

      return data
    },
    [mappings]
  )

  const getRecordTitle = useCallback(
    (data: Record<string, unknown>): string => {
      if (contentType === 'persona') {
        return `${(data.personaName as string) || 'Untitled'} — Persona`
      }
      return `${(data.companyName as string) || 'Untitled'} — Competitor`
    },
    [contentType]
  )

  const handleImport = useCallback(async () => {
    if (!parsed) return
    setImporting(true)
    setImportProgress(0)
    setImportedCount(0)

    const rowsToImport = parsed.rows.filter((_, i) => selectedRows.has(i))
    let successCount = 0

    for (let i = 0; i < rowsToImport.length; i++) {
      const row = rowsToImport[i]
      const structuredData = buildStructuredData(row)
      const title = getRecordTitle(structuredData)

      try {
        await createStructured.mutateAsync({
          brandId,
          title,
          contentType: contentType as KBContentType,
          structuredData,
          category: CONTENT_TYPE_CATEGORY[contentType] as
            | 'general'
            | 'brand_guidelines'
            | 'marketing_strategy'
            | 'campaign_history'
            | 'seo_research'
            | 'competitor_analysis'
            | 'customer_personas'
            | 'sop',
          knowledgeScope: 'brand',
        })
        successCount++
      } catch (err) {
        console.error(`Failed to import row ${i + 1}:`, err)
      }

      setImportProgress(Math.round(((i + 1) / rowsToImport.length) * 100))
      setImportedCount(successCount)
    }

    setImporting(false)
    setDone(true)
    toast.success(`Successfully imported ${successCount} records`)
  }, [
    parsed,
    selectedRows,
    buildStructuredData,
    getRecordTitle,
    createStructured,
    brandId,
    contentType,
  ])

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        // Reset all state
        setStep('upload')
        setFile(null)
        setParsed(null)
        setMappings({})
        setSelectedRows(new Set())
        setUploading(false)
        setImporting(false)
        setImportProgress(0)
        setImportedCount(0)
        setDone(false)
        if (done) {
          onComplete()
        }
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, onComplete, done]
  )

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const mappedPreviewRows = parsed
    ? parsed.rows
        .filter((_, i) => selectedRows.has(i))
        .slice(0, 5)
        .map(row => buildStructuredData(row))
    : []

  const selectedCount = selectedRows.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Import {contentType === 'persona' ? 'Personas' : 'Competitors'}{' '}
            from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file and map columns to{' '}
            {contentType === 'persona' ? 'persona' : 'competitor'} fields.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['upload', 'mapping', 'review'] as Step[]).map(
            (s, idx) => (
              <div key={s} className="flex items-center gap-2">
                {idx > 0 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                )}
                <Badge
                  variant={
                    step === s
                      ? 'default'
                      : (
                          ['upload', 'mapping', 'review'].indexOf(step) >
                          idx
                        )
                        ? 'secondary'
                        : 'outline'
                  }
                  className="text-xs"
                >
                  {idx + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                </Badge>
              </div>
            )
          )}
        </div>

        {/* ──────────── Step 1: Upload ──────────── */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center space-y-3">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground" />
              <div>
                <Label
                  htmlFor="csv-file"
                  className="text-sm font-medium cursor-pointer"
                >
                  {file ? file.name : 'Choose a CSV file'}
                </Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileSelect}
                  className="mt-2 max-w-xs mx-auto"
                />
              </div>
              {file && (
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            {file && parsed && (
              <p className="text-sm text-muted-foreground">
                Detected <strong>{parsed.rowCount}</strong> rows and{' '}
                <strong>{parsed.headers.length}</strong> columns
              </p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload & Parse
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ──────────── Step 2: Column Mapping ──────────── */}
        {step === 'mapping' && parsed && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Map each CSV column to a{' '}
              {contentType === 'persona' ? 'persona' : 'competitor'} field.
              Pre-populated with best guesses.
            </p>

            <div className="border rounded-lg divide-y">
              {/* Header row */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50">
                <span className="text-xs font-medium uppercase tracking-wider">
                  CSV Column
                </span>
                <span className="text-xs font-medium uppercase tracking-wider">
                  Maps to Field
                </span>
              </div>

              {/* Mapping rows */}
              {parsed.headers.map(header => (
                <div
                  key={header}
                  className="grid grid-cols-2 gap-4 p-3 items-center"
                >
                  <span className="text-sm font-mono truncate" title={header}>
                    {header}
                  </span>
                  <Select
                    value={mappings[header] ?? '__skip__'}
                    onValueChange={val => updateMapping(header, val)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">
                        Skip this column
                      </SelectItem>
                      {fields.map(field => (
                        <SelectItem key={field} value={field}>
                          {FIELD_LABELS[field] ?? field}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={() => setStep('review')}
                disabled={Object.keys(mappings).length === 0}
              >
                Next: Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ──────────── Step 3: Review & Confirm ──────────── */}
        {step === 'review' && parsed && !done && (
          <div className="space-y-4">
            {/* Select all toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedCount === parsed.rows.length}
                  onCheckedChange={toggleAllRows}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedCount} of {parsed.rows.length} rows selected
                </span>
              </div>
              <Badge variant="secondary">
                {Object.keys(mappings).length} fields mapped
              </Badge>
            </div>

            {/* Preview cards (first 5 selected rows) */}
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {parsed.rows.map((row, idx) => {
                if (idx >= 5 && !selectedRows.has(idx)) return null
                if (idx >= 5) return null // only show first 5

                const data = buildStructuredData(row)
                const title = getRecordTitle(data)

                return (
                  <div
                    key={idx}
                    className={`border rounded-lg p-3 space-y-2 transition-opacity ${
                      selectedRows.has(idx)
                        ? 'opacity-100'
                        : 'opacity-40'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedRows.has(idx)}
                        onCheckedChange={() => toggleRow(idx)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {title}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(data).map(
                            ([key, value]) => {
                              if (!value) return null
                              const display = Array.isArray(value)
                                ? value.join(', ')
                                : String(value)
                              return (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-[10px] max-w-[200px] truncate"
                                >
                                  <span className="font-medium mr-1">
                                    {FIELD_LABELS[key] ?? key}:
                                  </span>
                                  {display}
                                </Badge>
                              )
                            }
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
              {parsed.rows.length > 5 && (
                <p className="text-xs text-center text-muted-foreground">
                  ...and {parsed.rows.length - 5} more rows
                </p>
              )}
            </div>

            {/* Import progress */}
            {importing && (
              <div className="space-y-2">
                <Progress value={importProgress} />
                <p className="text-xs text-center text-muted-foreground">
                  Importing... {importedCount} / {selectedCount} records
                </p>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('mapping')}
                disabled={importing}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || selectedCount === 0}
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {selectedCount} record
                    {selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ──────────── Done ──────────── */}
        {done && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully imported {importedCount} records
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
