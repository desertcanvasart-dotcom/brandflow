'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Loader2, Trash2 } from 'lucide-react'
import type { ProjectStatus } from '@/types/enums'

const PROJECT_STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

interface ProjectSettingsDialogProps {
  project: {
    id: string
    name: string
    description: string | null
    status: ProjectStatus
    start_date: string | null
    end_date: string | null
  }
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProjectSettingsDialog({
  project,
  open,
  onOpenChange,
}: ProjectSettingsDialogProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project.status)
  const [startDate, setStartDate] = useState(project.start_date ?? '')
  const [endDate, setEndDate] = useState(project.end_date ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Re-sync the form whenever the dialog opens, so it never shows stale values
  useEffect(() => {
    if (open) {
      setName(project.name)
      setDescription(project.description ?? '')
      setStatus(project.status)
      setStartDate(project.start_date ?? '')
      setEndDate(project.end_date ?? '')
    }
  }, [open, project])

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      utils.project.getById.invalidate({ id: project.id })
      utils.project.list.invalidate()
      utils.project.listStats.invalidate()
      toast.success('Project updated')
      onOpenChange(false)
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      utils.project.list.invalidate()
      utils.project.listStats.invalidate()
      toast.success('Project deleted')
      onOpenChange(false)
      router.push('/projects')
    },
    onError: (err) => toast.error(err.message),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    updateMutation.mutate({
      id: project.id,
      name: name.trim(),
      description: description.trim(),
      status,
      startDate,
      endDate,
    })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Project Settings</DialogTitle>
              <DialogDescription>
                Update the project&apos;s name, description, status, and dates.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="project-settings-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="project-settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Q3 Social Media Campaign"
                  autoFocus
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="project-settings-desc">Description</Label>
                <Textarea
                  id="project-settings-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={status}
                  onValueChange={(v) => setStatus(v as ProjectStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start + End Date row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-settings-start">Start Date</Label>
                  <Input
                    id="project-settings-start"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-settings-end">End Date</Label>
                  <Input
                    id="project-settings-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Danger zone */}
              <div className="rounded-lg border border-destructive/30 p-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium">Delete project</p>
                    <p className="text-xs text-muted-foreground">
                      Permanently removes this project and its tasks.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending || !name.trim()}
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{project.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The project and everything attached to it
              will be permanently deleted. To keep the record instead, set the
              status to Archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                deleteMutation.mutate({ id: project.id })
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  Deleting...
                </>
              ) : (
                'Delete project'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
