'use client'

import { useRef, useState, useCallback, type KeyboardEvent, type ChangeEvent } from 'react'
import { Send, Paperclip, ClipboardList, FileText, Upload, FileIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { MentionPopover, type MemberOption } from './mention-popover'
import { SlashCommandPicker } from './slash-command-picker'
import type { ChatAttachment } from './attachment-card'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

interface ChatInputProps {
  channelId: string
  projectId?: string
  parentMessageId?: string
  onSend?: () => void
}

export function ChatInput({ channelId, projectId, parentMessageId, onSend }: ChatInputProps) {
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const [mentionOpen, setMentionOpen] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionStartPos, setMentionStartPos] = useState<number | null>(null)
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [briefPickerOpen, setBriefPickerOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const utils = trpc.useUtils()
  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setContent('')
      setAttachments([])
      utils.chat.getMessages.invalidate({ channelId })
      textareaRef.current?.focus()
      onSend?.()
    },
  })

  const threadReplyMutation = trpc.chat.sendThreadReply.useMutation({
    onSuccess: () => {
      setContent('')
      setAttachments([])
      if (parentMessageId) {
        utils.chat.getThreadReplies.invalidate({ parentMessageId })
      }
      textareaRef.current?.focus()
      onSend?.()
    },
  })

  const activeMutation = parentMessageId ? threadReplyMutation : sendMutation

  // Fetch team members for @mention
  const { data: membersData } = trpc.member.list.useQuery(undefined, {
    staleTime: 60_000,
  })

  const members: MemberOption[] = (membersData ?? []).map((m: any) => ({
    userId: m.user_id,
    displayName: m.display_name ?? m.email ?? 'Unknown',
    avatarUrl: m.avatar_url ?? null,
  }))

  // Fetch tasks for task picker (only when projectId is available)
  const { data: tasksData } = trpc.task.list.useQuery(
    { projectId: projectId! },
    { enabled: taskPickerOpen && !!projectId }
  )

  // Fetch briefs for brief picker (only when projectId is available)
  const { data: briefsData } = trpc.brief.list.useQuery(
    { projectId: projectId! },
    { enabled: briefPickerOpen && !!projectId }
  )

  const handleSlashCommand = useCallback(async (command: string) => {
    setSlashOpen(false)
    setContent('')

    // Extract the actual command name (e.g., '/ai summarize' -> 'summarize')
    const cmdName = command.replace('/ai ', '')

    setAiLoading(true)
    try {
      const response = await fetch('/api/ai/chat-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmdName, channelId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'AI command failed')
      }

      // Refresh messages to show the AI response
      utils.chat.getMessages.invalidate({ channelId })
      toast.success('AI response generated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'AI command failed')
    } finally {
      setAiLoading(false)
    }
  }, [channelId, utils])

  const handleSend = useCallback(() => {
    const trimmed = content.trim()

    // Check for slash command
    if (trimmed.startsWith('/ai ')) {
      const cmdName = trimmed.replace('/ai ', '')
      if (['summarize', 'tasks', 'decisions'].includes(cmdName)) {
        handleSlashCommand(trimmed)
        return
      }
    }

    if (!trimmed && attachments.length === 0) return

    const messageContent = trimmed || (attachments.length > 0 ? 'Shared an attachment' : '')

    if (parentMessageId) {
      threadReplyMutation.mutate({
        parentMessageId,
        channelId,
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
    } else {
      sendMutation.mutate({
        channelId,
        content: messageContent,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
    }
  }, [content, attachments, channelId, parentMessageId, sendMutation, threadReplyMutation, handleSlashCommand])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Don't send on Enter when mention or slash popover is open
    if (mentionOpen || slashOpen) return

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setContent(value)

    const cursorPos = e.target.selectionStart
    const textBefore = value.slice(0, cursorPos)

    // Check for / trigger at start of input
    if (value.startsWith('/')) {
      const slashText = value.slice(1).split(' ')[0] ?? ''
      // Only show picker if cursor is still in the command part
      if (cursorPos <= (slashText.length + 1)) {
        setSlashOpen(true)
        setSlashFilter(value)
        setMentionOpen(false)
        return
      }
    }
    setSlashOpen(false)
    setSlashFilter('')

    // Check for @ trigger
    const lastAt = textBefore.lastIndexOf('@')

    if (lastAt !== -1) {
      const textAfterAt = textBefore.slice(lastAt + 1)
      // Only trigger if @ is at start or preceded by a space, and no space in the search text
      const charBefore = lastAt > 0 ? value[lastAt - 1] : ' '
      if ((charBefore === ' ' || charBefore === '\n' || lastAt === 0) && !textAfterAt.includes(' ')) {
        setMentionOpen(true)
        setMentionFilter(textAfterAt)
        setMentionStartPos(lastAt)
        return
      }
    }

    setMentionOpen(false)
    setMentionFilter('')
    setMentionStartPos(null)
  }

  const handleMentionSelect = (member: MemberOption) => {
    if (mentionStartPos === null) return

    const before = content.slice(0, mentionStartPos)
    const after = content.slice(
      mentionStartPos + 1 + mentionFilter.length // +1 for @
    )
    const mention = `@[${member.displayName}](${member.userId}) `
    const newContent = before + mention + after

    setContent(newContent)
    setMentionOpen(false)
    setMentionFilter('')
    setMentionStartPos(null)

    // Refocus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus()
        const newPos = before.length + mention.length
        textareaRef.current.setSelectionRange(newPos, newPos)
      }
    }, 0)
  }

  const handleLinkTask = (task: any) => {
    setAttachments((prev) => [
      ...prev,
      {
        type: 'task' as const,
        id: task.id,
        title: task.title,
        serviceType: task.service_type,
        status: task.status,
      },
    ])
    setTaskPickerOpen(false)
    setAttachOpen(false)
  }

  const handleLinkBrief = (brief: any) => {
    setAttachments((prev) => [
      ...prev,
      {
        type: 'brief' as const,
        id: brief.id,
        service: brief.title,
        status: brief.status,
        fieldsFilled: brief.body ? Object.keys(brief.body).length : 0,
      },
    ])
    setBriefPickerOpen(false)
    setAttachOpen(false)
  }

  const getUploadUrl = trpc.chat.getFileUploadUrl.useMutation()

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const { uploadUrl, publicUrl } = await getUploadUrl.mutateAsync({
        fileName: file.name,
        contentType: file.type,
        channelId,
      })

      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      setAttachments((prev) => [
        ...prev,
        {
          type: 'file' as const,
          id: publicUrl,
          title: file.name,
          serviceType: file.type,
          status: formatFileSize(file.size),
        },
      ])
      setAttachOpen(false)
    } catch (err) {
      toast.error('File upload failed')
      console.error('File upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="border-t bg-background px-4 py-3">
      {/* AI loading indicator */}
      {aiLoading && (
        <div className="mb-2 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          AI is analyzing messages...
        </div>
      )}

      {/* Pending attachment previews */}
      {attachments.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {attachments.map((att, i) => (
            <div
              key={`${att.type}-${att.id}-${i}`}
              className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
            >
              {att.type === 'task' ? (
                <ClipboardList className="h-3 w-3 text-muted-foreground" />
              ) : att.type === 'file' ? (
                <FileIcon className="h-3 w-3 text-muted-foreground" />
              ) : (
                <FileText className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="max-w-32 truncate">
                {att.title ?? att.service ?? att.type}
              </span>
              <button
                type="button"
                onClick={() => removeAttachment(i)}
                className="ml-1 text-muted-foreground hover:text-foreground"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex items-end gap-2">
        {/* Mention popover */}
        <MentionPopover
          open={mentionOpen}
          filter={mentionFilter}
          members={members}
          onSelect={handleMentionSelect}
          onClose={() => setMentionOpen(false)}
        />

        {/* Slash command picker */}
        <SlashCommandPicker
          open={slashOpen}
          filter={slashFilter}
          onSelect={handleSlashCommand}
          onClose={() => setSlashOpen(false)}
        />

        {/* Attach button */}
        <Popover open={attachOpen} onOpenChange={setAttachOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-48 p-1" side="top">
            {/* Link Task — only when projectId is available */}
            {projectId && (
              <Popover open={taskPickerOpen} onOpenChange={setTaskPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    Link Task
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 max-h-60 overflow-y-auto p-1" side="right">
                  {(tasksData ?? []).length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No tasks found</p>
                  ) : (
                    (tasksData ?? []).map((task: any) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleLinkTask(task)}
                        className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        <span className="font-medium truncate w-full text-left">{task.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {task.service_type ?? 'Task'} · {task.status?.replace(/_/g, ' ')}
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* Link Brief — only when projectId is available */}
            {projectId && (
              <Popover open={briefPickerOpen} onOpenChange={setBriefPickerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Link Brief
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-64 max-h-60 overflow-y-auto p-1" side="right">
                  {(briefsData ?? []).length === 0 ? (
                    <p className="px-2 py-3 text-center text-xs text-muted-foreground">No briefs found</p>
                  ) : (
                    (briefsData ?? []).map((brief: any) => (
                      <button
                        key={brief.id}
                        type="button"
                        onClick={() => handleLinkBrief(brief)}
                        className="flex w-full flex-col items-start rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                      >
                        <span className="font-medium truncate w-full text-left">{brief.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {brief.status?.replace(/_/g, ' ')}
                        </span>
                      </button>
                    ))
                  )}
                </PopoverContent>
              </Popover>
            )}

            {/* File Upload */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Upload className="h-4 w-4 text-muted-foreground" />
              )}
              {uploading ? 'Uploading...' : 'File Upload'}
            </button>
          </PopoverContent>
        </Popover>

        {/* Textarea */}
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message... (@ to mention, / for commands)"
          className="min-h-[40px] max-h-32 resize-none"
          rows={1}
          disabled={activeMutation.isPending || aiLoading}
        />

        {/* Send button */}
        <Button
          type="button"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={handleSend}
          disabled={
            activeMutation.isPending ||
            aiLoading ||
            (!content.trim() && attachments.length === 0)
          }
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Hidden file input for upload */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
        onChange={handleFileUpload}
      />
    </div>
  )
}
