'use client'

import { useState } from 'react'
import { trpc } from '@/trpc/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Folder, FileIcon, ChevronRight, ArrowLeft, Loader2, Import } from 'lucide-react'
import { toast } from 'sonner'

type BrowseLevel = 'teams' | 'projects' | 'files' | 'pages'

interface Breadcrumb {
  label: string
  level: BrowseLevel
}

interface FigmaFileBrowserProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: string
  onImportSuccess?: () => void
}

export function FigmaFileBrowser({
  open,
  onOpenChange,
  taskId,
  onImportSuccess,
}: FigmaFileBrowserProps) {
  const [level, setLevel] = useState<BrowseLevel>('teams')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null)
  const [selectedFileKey, setSelectedFileKey] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null)

  const { data: connection } = trpc.figma.getConnection.useQuery()

  const { data: projects, isLoading: projectsLoading } = trpc.figma.listProjects.useQuery(
    { teamId: selectedTeamId! },
    { enabled: !!selectedTeamId && level === 'projects' }
  )

  const { data: files, isLoading: filesLoading } = trpc.figma.listFiles.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId && level === 'files' }
  )

  const { data: fileDetail, isLoading: fileDetailLoading } = trpc.figma.getFile.useQuery(
    { fileKey: selectedFileKey! },
    { enabled: !!selectedFileKey && level === 'pages' }
  )

  const importMutation = trpc.figma.importAsDeliverable.useMutation({
    onSuccess: () => {
      toast.success('Design imported as deliverable')
      onImportSuccess?.()
      handleClose()
    },
    onError: (error) => {
      toast.error(`Import failed: ${error.message}`)
    },
  })

  const teamIds = connection?.figma_team_ids ?? []

  const breadcrumbs: Breadcrumb[] = (() => {
    const crumbs: Breadcrumb[] = [{ label: 'Teams', level: 'teams' }]
    if (level === 'projects' || level === 'files' || level === 'pages') {
      crumbs.push({ label: selectedTeamId ?? 'Team', level: 'projects' })
    }
    if (level === 'files' || level === 'pages') {
      crumbs.push({ label: selectedProjectName ?? 'Project', level: 'files' })
    }
    if (level === 'pages') {
      crumbs.push({ label: selectedFileName ?? 'File', level: 'pages' })
    }
    return crumbs
  })()

  const handleClose = () => {
    onOpenChange(false)
    setLevel('teams')
    setSelectedTeamId(null)
    setSelectedProjectId(null)
    setSelectedProjectName(null)
    setSelectedFileKey(null)
    setSelectedFileName(null)
  }

  const navigateTo = (targetLevel: BrowseLevel) => {
    setLevel(targetLevel)
    if (targetLevel === 'teams') {
      setSelectedTeamId(null)
      setSelectedProjectId(null)
      setSelectedProjectName(null)
      setSelectedFileKey(null)
      setSelectedFileName(null)
    } else if (targetLevel === 'projects') {
      setSelectedProjectId(null)
      setSelectedProjectName(null)
      setSelectedFileKey(null)
      setSelectedFileName(null)
    } else if (targetLevel === 'files') {
      setSelectedFileKey(null)
      setSelectedFileName(null)
    }
  }

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId)
    setLevel('projects')
  }

  const handleSelectProject = (projectId: number, projectName: string) => {
    setSelectedProjectId(String(projectId))
    setSelectedProjectName(projectName)
    setLevel('files')
  }

  const handleSelectFile = (fileKey: string, fileName: string) => {
    setSelectedFileKey(fileKey)
    setSelectedFileName(fileName)
    setLevel('pages')
  }

  const handleImport = (nodeId?: string, pageName?: string) => {
    if (!selectedFileKey) return

    let figmaUrl = `https://www.figma.com/file/${selectedFileKey}`
    if (nodeId) {
      figmaUrl += `?node-id=${nodeId}`
    }

    importMutation.mutate({
      taskId,
      fileKey: selectedFileKey,
      nodeId: nodeId ?? undefined,
      fileName: pageName ?? selectedFileName ?? 'Untitled',
      figmaUrl,
    })
  }

  const goBack = () => {
    if (level === 'pages') navigateTo('files')
    else if (level === 'files') navigateTo('projects')
    else if (level === 'projects') navigateTo('teams')
  }

  const renderLoading = () => (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.level} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-3 w-3" />}
          {index < breadcrumbs.length - 1 ? (
            <button
              type="button"
              onClick={() => navigateTo(crumb.level)}
              className="hover:text-foreground transition"
            >
              {crumb.label}
            </button>
          ) : (
            <span className="text-foreground font-medium">{crumb.label}</span>
          )}
        </span>
      ))}
    </div>
  )

  const renderTeams = () => {
    if (teamIds.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No Figma teams configured. Add team IDs in Settings.
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {teamIds.map((teamId) => (
          <button
            key={teamId}
            type="button"
            onClick={() => handleSelectTeam(teamId)}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition"
          >
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{teamId}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </button>
        ))}
      </div>
    )
  }

  const renderProjects = () => {
    if (projectsLoading) return renderLoading()

    if (!projects || projects.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No projects found in this team.
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {projects.map((project) => (
          <button
            key={project.id}
            type="button"
            onClick={() => handleSelectProject(project.id, project.name)}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition"
          >
            <Folder className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="truncate">{project.name}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </button>
        ))}
      </div>
    )
  }

  const renderFiles = () => {
    if (filesLoading) return renderLoading()

    if (!files || files.length === 0) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No files found in this project.
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {files.map((file) => (
          <button
            key={file.key}
            type="button"
            onClick={() => handleSelectFile(file.key, file.name)}
            className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm hover:bg-accent transition"
          >
            {file.thumbnail_url ? (
              <img
                src={file.thumbnail_url}
                alt={file.name}
                className="h-9 w-12 object-cover rounded shrink-0"
              />
            ) : (
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <div className="flex flex-col items-start min-w-0">
              <span className="truncate w-full text-left">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(file.last_modified).toLocaleDateString()}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
          </button>
        ))}
      </div>
    )
  }

  const renderPages = () => {
    if (fileDetailLoading) return renderLoading()

    if (!fileDetail) {
      return (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Failed to load file details.
        </div>
      )
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">{fileDetail.name}</h4>
          <Button
            size="sm"
            onClick={() => handleImport(undefined, selectedFileName ?? fileDetail.name)}
            disabled={importMutation.isPending}
          >
            {importMutation.isPending ? (
              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            ) : (
              <Import className="mr-2 h-3 w-3" />
            )}
            Import entire file
          </Button>
        </div>

        <Separator />

        <div className="space-y-1">
          {fileDetail.pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm"
            >
              <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{page.name}</span>
              <Badge variant="secondary" className="ml-auto mr-2 text-xs shrink-0">
                {page.type}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleImport(page.id, page.name)}
                disabled={importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Import className="mr-1 h-3 w-3" />
                )}
                Import
              </Button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderContent = () => {
    switch (level) {
      case 'teams':
        return renderTeams()
      case 'projects':
        return renderProjects()
      case 'files':
        return renderFiles()
      case 'pages':
        return renderPages()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Browse Figma Files</DialogTitle>
          <DialogDescription>
            Select a Figma file or page to import as a deliverable
          </DialogDescription>
        </DialogHeader>

        {renderBreadcrumbs()}

        {level !== 'teams' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="w-fit -mt-1 mb-1"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back
          </Button>
        )}

        <ScrollArea className="max-h-[400px]">
          {renderContent()}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
