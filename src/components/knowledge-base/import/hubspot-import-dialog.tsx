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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Loader2, ExternalLink, Check, Users, AlertCircle } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { CONTENT_TYPE_CATEGORY } from '@/types/kb-forms'
import type { PersonaData } from '@/types/kb-forms'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HubSpotPersonaPreview extends Partial<PersonaData> {
  _hubspotId: string
  _email: string
}

interface HubSpotImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  brandId?: string
  onComplete: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function HubSpotImportDialog({
  open,
  onOpenChange,
  orgId,
  brandId,
  onComplete,
}: HubSpotImportDialogProps) {
  const [personas, setPersonas] = useState<HubSpotPersonaPreview[]>([])
  const [totalContacts, setTotalContacts] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fetching, setFetching] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [done, setDone] = useState(false)
  const [connectionError, setConnectionError] = useState(false)

  const createStructured = trpc.knowledgeBase.createStructured.useMutation()

  // -------------------------------------------------------------------------
  // Fetch personas from HubSpot
  // -------------------------------------------------------------------------

  const handleFetchPersonas = useCallback(async () => {
    setFetching(true)
    setConnectionError(false)

    try {
      const resp = await fetch('/api/integrations/hubspot/import-personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId }),
      })

      if (resp.status === 400) {
        const body = await resp.json()
        if (body.error === 'HubSpot not connected') {
          setConnectionError(true)
          setFetching(false)
          return
        }
      }

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(
          (body as { error?: string }).error || 'Failed to fetch personas'
        )
      }

      const data = await resp.json()
      setPersonas(data.personas)
      setTotalContacts(data.totalContacts)
      // Select all personas by default
      setSelectedIds(
        new Set(data.personas.map((p: HubSpotPersonaPreview) => p._hubspotId))
      )
      setFetched(true)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to fetch HubSpot contacts'
      )
    } finally {
      setFetching(false)
    }
  }, [orgId])

  // -------------------------------------------------------------------------
  // Selection helpers
  // -------------------------------------------------------------------------

  const togglePersona = useCallback((hubspotId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(hubspotId)) {
        next.delete(hubspotId)
      } else {
        next.add(hubspotId)
      }
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === personas.length) {
        return new Set()
      }
      return new Set(personas.map((p) => p._hubspotId))
    })
  }, [personas])

  // -------------------------------------------------------------------------
  // Count mapped fields for a persona
  // -------------------------------------------------------------------------

  const countMappedFields = useCallback((p: HubSpotPersonaPreview): number => {
    let count = 0
    if (p.personaName && p.personaName !== 'Unknown') count++
    if (p.role) count++
    if (p.demographics) count++
    if (p._email) count++
    return count
  }, [])

  // -------------------------------------------------------------------------
  // Import selected personas
  // -------------------------------------------------------------------------

  const handleImport = useCallback(async () => {
    const selected = personas.filter((p) => selectedIds.has(p._hubspotId))
    if (selected.length === 0) return

    setImporting(true)
    setImportProgress(0)
    setImportedCount(0)

    let successCount = 0

    for (let i = 0; i < selected.length; i++) {
      const persona = selected[i]

      const structuredData: Record<string, unknown> = {
        personaName: persona.personaName || 'Unknown',
        role: persona.role || '',
        demographics: persona.demographics || '',
        goals: persona.goals || [],
        painPoints: persona.painPoints || [],
        preferredChannels: persona.preferredChannels || [],
        behaviorNotes: persona.behaviorNotes || '',
        quotes: persona.quotes || [],
      }

      const title = `${persona.personaName || 'Unknown'} \u2014 Persona`

      try {
        await createStructured.mutateAsync({
          brandId,
          title,
          contentType: 'persona',
          structuredData,
          category: CONTENT_TYPE_CATEGORY.persona as
            | 'general'
            | 'brand_guidelines'
            | 'marketing_strategy'
            | 'campaign_history'
            | 'seo_research'
            | 'competitor_analysis'
            | 'customer_personas'
            | 'sop',
          knowledgeScope: 'brand',
          autoFillSource: 'hubspot',
        })
        successCount++
      } catch (err) {
        console.error(
          `Failed to import persona ${persona.personaName}:`,
          err
        )
      }

      setImportProgress(Math.round(((i + 1) / selected.length) * 100))
      setImportedCount(successCount)
    }

    setImporting(false)
    setDone(true)
    toast.success(`Successfully imported ${successCount} personas from HubSpot`)
  }, [personas, selectedIds, createStructured, brandId])

  // -------------------------------------------------------------------------
  // Connect to HubSpot
  // -------------------------------------------------------------------------

  const handleConnect = useCallback(() => {
    window.open('/api/integrations/hubspot/connect', '_blank')
  }, [])

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setPersonas([])
        setTotalContacts(0)
        setSelectedIds(new Set())
        setFetching(false)
        setFetched(false)
        setImporting(false)
        setImportProgress(0)
        setImportedCount(0)
        setConnectionError(false)
        if (done) {
          onComplete()
        }
        setDone(false)
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, onComplete, done]
  )

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const selectedCount = selectedIds.size

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Import Personas from HubSpot
          </DialogTitle>
          <DialogDescription>
            Pull contacts from your HubSpot CRM and import them as persona
            records in your Knowledge Base.
          </DialogDescription>
        </DialogHeader>

        {/* ---- Not connected state ---- */}
        {connectionError && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-orange-100 dark:bg-orange-900/30 p-3">
              <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">HubSpot Not Connected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Connect your HubSpot account to import contacts as personas.
              </p>
            </div>
            <Button onClick={handleConnect}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect to HubSpot
            </Button>
            <p className="text-xs text-muted-foreground">
              After connecting, close this dialog and try again.
            </p>
          </div>
        )}

        {/* ---- Initial state: fetch button ---- */}
        {!connectionError && !fetched && !done && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-3">
              <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Fetch Contacts from HubSpot
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                We will pull contacts with job titles and map them to persona
                fields.
              </p>
            </div>
            <Button onClick={handleFetchPersonas} disabled={fetching}>
              {fetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Fetching contacts...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Fetch HubSpot Contacts
                </>
              )}
            </Button>
          </div>
        )}

        {/* ---- Preview & select state ---- */}
        {fetched && !done && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <strong>{personas.length}</strong> contacts with role info
                out of <strong>{totalContacts}</strong> total contacts.
              </p>
              <Badge variant="secondary">{selectedCount} selected</Badge>
            </div>

            {personas.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No contacts with job title or persona data found in your
                  HubSpot account.
                </p>
              </div>
            ) : (
              <>
                {/* Select all */}
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Checkbox
                    checked={selectedCount === personas.length}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">Select all</span>
                </div>

                {/* Persona list */}
                <div className="space-y-2 max-h-[340px] overflow-y-auto">
                  {personas.map((persona) => (
                    <div
                      key={persona._hubspotId}
                      className={`flex items-start gap-3 border rounded-lg p-3 transition-opacity ${
                        selectedIds.has(persona._hubspotId)
                          ? 'opacity-100'
                          : 'opacity-40'
                      }`}
                    >
                      <Checkbox
                        checked={selectedIds.has(persona._hubspotId)}
                        onCheckedChange={() =>
                          togglePersona(persona._hubspotId)
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {persona.personaName || 'Unknown'}
                          </p>
                          {persona.role && (
                            <Badge variant="outline" className="text-[10px]">
                              {persona.role}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {persona._email && <span>{persona._email}</span>}
                          {persona.demographics && (
                            <span>{persona.demographics}</span>
                          )}
                          <Badge
                            variant="secondary"
                            className="text-[10px] ml-auto"
                          >
                            {countMappedFields(persona)} fields mapped
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Import progress */}
                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-xs text-center text-muted-foreground">
                      Importing... {importedCount} / {selectedCount} personas
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => handleClose(false)}
                    disabled={importing}
                  >
                    Cancel
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
                        Import {selectedCount} persona
                        {selectedCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ---- Done state ---- */}
        {done && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium">Import Complete</p>
              <p className="text-sm text-muted-foreground mt-1">
                Successfully imported {importedCount} personas from HubSpot
              </p>
            </div>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
