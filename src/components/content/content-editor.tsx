'use client'

import { useEffect, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Highlighter,
  Undo,
  Redo,
  Save,
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FileText,
  Plus,
  Trash2,
  Clock,
  CalendarIcon,
} from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/utils'
import { ScheduleDialog } from './schedule-dialog'
import type { Database } from '@/types/database'

type ContentItemRow = Database['public']['Tables']['content_items']['Row']

const PLATFORMS = [
  'instagram', 'facebook', 'twitter', 'linkedin',
  'tiktok', 'youtube', 'blog', 'newsletter', 'other',
] as const

interface ContentEditorProps {
  taskId: string
}

export function ContentEditor({ taskId }: ContentEditorProps) {
  const utils = trpc.useUtils()
  const { data: items, isLoading } = trpc.content.listByTaskId.useQuery({ taskId })

  const createMutation = trpc.content.create.useMutation({
    onSuccess: () => {
      utils.content.listByTaskId.invalidate({ taskId })
      toast.success('Content item added')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.content.delete.useMutation({
    onSuccess: () => {
      utils.content.listByTaskId.invalidate({ taskId })
      toast.success('Content item removed')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {items && items.length > 0 ? (
        items.map((item, index) => (
          <ContentItemCard
            key={item.id}
            item={item}
            taskId={taskId}
            index={index + 1}
            onDelete={() => {
              if (confirm('Remove this content item?')) {
                deleteMutation.mutate({ id: item.id })
              }
            }}
          />
        ))
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No content yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add content items to start writing copy for this task.
            </p>
          </div>
        </div>
      )}

      {/* Add another button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs border-dashed"
        onClick={() => createMutation.mutate({ taskId })}
        disabled={createMutation.isPending}
      >
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {createMutation.isPending ? 'Adding...' : 'Add Content Item'}
      </Button>
    </div>
  )
}

/* ─── Single Content Item Card ─── */

interface ContentItemCardProps {
  item: ContentItemRow
  taskId: string
  index: number
  onDelete: () => void
}

function ContentItemCard({ item, taskId, index, onDelete }: ContentItemCardProps) {
  const utils = trpc.useUtils()
  const [expanded, setExpanded] = useState(true)
  const [showVersions, setShowVersions] = useState(false)
  const [changeNote, setChangeNote] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)

  const { data: versions } = trpc.content.getVersions.useQuery(
    { contentItemId: item.id },
    { enabled: showVersions }
  )

  const updateMutation = trpc.content.update.useMutation({
    onSuccess: () => {
      utils.content.listByTaskId.invalidate({ taskId })
      utils.content.getVersions.invalidate({ contentItemId: item.id })
      toast.success('Content saved')
      setChangeNote('')
    },
    onError: (err) => toast.error(err.message),
  })

  const restoreMutation = trpc.content.restoreVersion.useMutation({
    onSuccess: (data) => {
      utils.content.listByTaskId.invalidate({ taskId })
      utils.content.getVersions.invalidate({ contentItemId: item.id })
      if (data?.body && editor) {
        editor.commands.setContent(data.body)
      }
      toast.success('Version restored')
    },
    onError: (err) => toast.error(err.message),
  })

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing content...' }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight,
      Image,
    ],
    content: item.body ?? '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
      },
    },
  })

  // Sync content when item data changes (e.g. after restore)
  useEffect(() => {
    if (item.body && editor && !editor.isDestroyed && !editor.isFocused) {
      const currentHTML = editor.getHTML()
      if (currentHTML !== item.body) {
        editor.commands.setContent(item.body)
      }
    }
  }, [item.body, editor])

  function handleSave() {
    if (!editor) return
    updateMutation.mutate({
      id: item.id,
      body: editor.getHTML(),
      changeNote: changeNote || undefined,
    })
  }

  function handleAddLink() {
    if (!editor) return
    const url = window.prompt('Enter URL')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  function handlePlatformChange(platform: string) {
    updateMutation.mutate({
      id: item.id,
      platform: platform as typeof PLATFORMS[number],
    })
  }

  const charCount = editor?.getText().length ?? 0

  return (
    <div className="rounded-lg border bg-card">
      {/* Card header */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium">Content #{index}</span>
          <Badge variant="secondary" className="text-[10px] h-5">
            {item.platform}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete() }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t px-3 py-3 space-y-3">
          {/* Platform selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Platform:</span>
            <Select value={item.platform} onValueChange={handlePlatformChange}>
              <SelectTrigger className="h-7 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATFORMS.map((p) => (
                  <SelectItem key={p} value={p} className="text-xs capitalize">
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Toolbar */}
          {editor && (
            <div className="flex flex-wrap items-center gap-0.5 rounded-md border bg-muted/30 p-1">
              <Button
                variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <UnderlineIcon className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                <Strikethrough className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive('highlight') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
              >
                <Highlighter className="h-3 w-3" />
              </Button>

              <Separator orientation="vertical" className="mx-0.5 h-4" />

              <Button
                variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-3 w-3" />
              </Button>

              <Separator orientation="vertical" className="mx-0.5 h-4" />

              <Button
                variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
              >
                <AlignLeft className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
              >
                <AlignCenter className="h-3 w-3" />
              </Button>
              <Button
                variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
              >
                <AlignRight className="h-3 w-3" />
              </Button>

              <Separator orientation="vertical" className="mx-0.5 h-4" />

              <Button
                variant={editor.isActive('link') ? 'secondary' : 'ghost'}
                size="sm" className="h-6 w-6 p-0"
                onClick={handleAddLink}
              >
                <LinkIcon className="h-3 w-3" />
              </Button>

              <div className="ml-auto flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                  onClick={() => editor.chain().focus().undo().run()}
                  disabled={!editor.can().undo()}
                >
                  <Undo className="h-3 w-3" />
                </Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                  onClick={() => editor.chain().focus().redo().run()}
                  disabled={!editor.can().redo()}
                >
                  <Redo className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Editor area */}
          <div className="rounded-md border bg-white">
            <EditorContent editor={editor} />
            <div className="border-t px-3 py-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{charCount} chars</span>
              <span>⌘+Enter to save</span>
            </div>
          </div>

          {/* Save row */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="Change note (optional)"
              className="flex-1 h-7 rounded-md border border-input bg-background px-2 text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            />
            <Button size="sm" className="h-7 px-3 text-xs"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              <Save className="h-3 w-3 mr-1" />
              {updateMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>

          {/* Versions toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-6 text-[10px] gap-1 text-muted-foreground"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-3 w-3" />
            Version History
            {showVersions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </Button>

          {showVersions && (
            <div className="rounded-md border bg-muted/20 p-2 space-y-1.5">
              {versions && versions.length > 0 ? (
                versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded border bg-white px-2 py-1.5">
                    <div>
                      <span className="text-[10px] font-medium">v{v.version_number}</span>
                      {v.change_note && (
                        <span className="text-[10px] text-muted-foreground ml-1.5">{v.change_note}</span>
                      )}
                      <p className="text-[9px] text-muted-foreground">
                        {new Date(v.created_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]"
                      onClick={() => restoreMutation.mutate({ contentItemId: item.id, versionId: v.id })}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-2.5 w-2.5 mr-0.5" />
                      Restore
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-1">No versions yet.</p>
              )}
            </div>
          )}

          {/* Scheduling section */}
          <Separator className="my-1" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Schedule:</span>
              {item.scheduled_at ? (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {formatDateTime(item.scheduled_at)}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground italic">Not scheduled</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setScheduleOpen(true)}
            >
              <CalendarIcon className="h-3 w-3 mr-1" />
              {item.scheduled_at ? 'Reschedule' : 'Schedule'}
            </Button>
          </div>

          {item.published_at && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 font-medium">
                Published {formatDateTime(item.published_at)}
              </span>
              {item.published_url && (
                <a href={item.published_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary underline">
                  View
                </a>
              )}
            </div>
          )}

          <ScheduleDialog
            open={scheduleOpen}
            onOpenChange={setScheduleOpen}
            contentItemId={item.id}
            currentScheduledAt={item.scheduled_at}
            taskId={taskId}
          />
        </div>
      )}
    </div>
  )
}
