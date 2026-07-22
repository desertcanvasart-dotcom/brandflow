'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
type ImportSource = 'zoom' | 'google_meet' | 'teams' | 'upload'

interface ImportTranscriptModalProps {
  roomId: string
  trigger?: React.ReactNode
  onImported?: () => void
}

const SOURCE_OPTIONS: { value: ImportSource; label: string }[] = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'teams', label: 'Microsoft Teams' },
  { value: 'upload', label: 'Other / Manual Upload' },
]

function parseVTT(content: string): string {
  // Remove WEBVTT header and metadata
  const lines = content.split('\n')
  const textLines: string[] = []
  let skipNext = false

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip WEBVTT header, NOTE blocks, and timestamps
    if (trimmed === 'WEBVTT' || trimmed.startsWith('NOTE')) {
      skipNext = true
      continue
    }
    if (trimmed === '') {
      skipNext = false
      continue
    }
    if (skipNext) continue
    // Skip timestamp lines (e.g., 00:00:01.000 --> 00:00:04.000)
    if (/^\d{2}:\d{2}/.test(trimmed) && trimmed.includes('-->')) continue
    // Skip cue identifiers (numeric)
    if (/^\d+$/.test(trimmed)) continue

    textLines.push(trimmed)
  }

  return textLines.join('\n')
}

function parseSRT(content: string): string {
  const lines = content.split('\n')
  const textLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Skip empty lines
    if (!trimmed) continue
    // Skip sequence numbers
    if (/^\d+$/.test(trimmed)) continue
    // Skip timestamp lines
    if (/^\d{2}:\d{2}/.test(trimmed) && trimmed.includes('-->')) continue

    textLines.push(trimmed)
  }

  return textLines.join('\n')
}

export function ImportTranscriptModal({ roomId, trigger, onImported }: ImportTranscriptModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [source, setSource] = useState<ImportSource>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const importMutation = trpc.meetingRoom.importTranscript.useMutation()
  const utils = trpc.useUtils()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    const validTypes = ['.vtt', '.srt', '.txt']
    const ext = selected.name.substring(selected.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(ext)) {
      toast.error('Please upload a .vtt, .srt, or .txt file')
      return
    }

    if (selected.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB')
      return
    }

    setFile(selected)
    if (!title) {
      setTitle(selected.name.replace(/\.(vtt|srt|txt)$/i, ''))
    }
  }

  const handleImport = async () => {
    if (!file || !title.trim()) return

    setImporting(true)
    try {
      const content = await file.text()
      const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

      let transcriptText: string
      if (ext === '.vtt') {
        transcriptText = parseVTT(content)
      } else if (ext === '.srt') {
        transcriptText = parseSRT(content)
      } else {
        transcriptText = content
      }

      if (!transcriptText.trim()) {
        toast.error('The file appears to be empty after parsing')
        setImporting(false)
        return
      }

      await importMutation.mutateAsync({
        roomId,
        title: title.trim(),
        source,
        transcriptText: transcriptText.trim(),
      })

      utils.meetingRoom.listSessions.invalidate()
      toast.success('Transcript imported successfully')
      onImported?.()
      resetAndClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to import transcript')
    } finally {
      setImporting(false)
    }
  }

  const resetAndClose = () => {
    setTitle('')
    setSource('upload')
    setFile(null)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetAndClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Import Transcript
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import External Transcript</DialogTitle>
          <DialogDescription>
            Upload a transcript from Zoom, Google Meet, Teams, or other sources.
            Supported formats: VTT, SRT, TXT.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="transcript-title">Session Title</Label>
            <Input
              id="transcript-title"
              placeholder="e.g. Client Kickoff — March 5"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={importing}
            />
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={source}
              onValueChange={(v) => setSource(v as ImportSource)}
              disabled={importing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label>Transcript File</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".vtt,.srt,.txt"
              onChange={handleFileSelect}
              className="hidden"
              disabled={importing}
            />
            {file ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 shrink-0"
                  onClick={() => setFile(null)}
                  disabled={importing}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:border-primary/50 hover:bg-accent/50"
                disabled={importing}
              >
                <Upload className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  VTT, SRT, or TXT up to 10MB
                </p>
              </button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose} disabled={importing}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || !title.trim() || importing}
          >
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              'Import Transcript'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
