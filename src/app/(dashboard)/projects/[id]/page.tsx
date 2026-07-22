'use client'

import { Suspense, use, useState, useEffect } from 'react'
import { notFound, useSearchParams } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Settings, Video, ClipboardList, LayoutList, Mail, DoorOpen, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { trpc } from '@/trpc/client'
import { PROJECT_TYPE_LABELS, MEETING_TYPE_LABELS, MEETING_STATUS_LABELS } from '@/lib/constants'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { PhaseTracker } from '@/components/phases/phase-tracker'
import { TaskListView } from '@/components/tasks/task-list-view'
import { ProjectOverview } from '@/components/projects/project-overview'
import { ProjectTeam } from '@/components/projects/project-team'
import { IntakeTab } from '@/components/intake/intake-tab'
import { ProjectHealthBadge } from '@/components/projects/project-health-badge'
import { ProjectTaskBoard } from '@/components/tasks/project-task-board'
import { TaskSelectionDrawer } from '@/components/tasks/task-selection-drawer'
import { ProjectEmailTab } from '@/components/email/project-email-tab'
import { ChatPanel } from '@/components/chat/chat-panel'
import { UnreadBadge } from '@/components/chat/unread-badge'
import type { MeetingType, MeetingStatus } from '@/types/enums'

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" /></div>}>
      <ProjectDetailContent params={params} />
    </Suspense>
  )
}

function ProjectDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const { data: project, isLoading } = trpc.project.getById.useQuery({ id })
  const { data: projectMeetings } = trpc.meeting.list.useQuery(
    { projectId: id },
    { enabled: !!id }
  )

  // Task drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerServiceType, setDrawerServiceType] = useState<string | undefined>()

  // Auto-open drawer from URL params (e.g. after project creation)
  useEffect(() => {
    if (searchParams.get('setupTasks') === 'true') {
      const services = searchParams.get('services')
      if (services) setDrawerServiceType(services.split(',')[0])
      setDrawerOpen(true)
    }
  }, [searchParams])

  const defaultTab = searchParams.get('tab') ?? 'overview'

  if (isLoading) {
    return (
      <>
        <TopBar title="Loading..." />
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-muted" />
          <div className="h-4 w-96 rounded bg-muted" />
        </div>
      </>
    )
  }

  if (!project) {
    notFound()
  }

  const showBoard = project.type === 'content_ops' || project.type === 'full_service'
  const showPhases = project.type === 'web_build' || project.type === 'full_service'

  return (
    <>
      <TopBar title={project.name} />
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {project.brands?.logo_url ? (
              <img
                src={project.brands.logo_url}
                alt={project.brands.name}
                className="h-10 w-10 rounded object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary font-semibold">
                {project.brands?.name?.charAt(0) ?? 'P'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">{project.name}</h2>
                <Badge variant="outline">
                  {PROJECT_TYPE_LABELS[project.type]}
                </Badge>
                <ProjectHealthBadge projectId={id} />
              </div>
              <p className="text-sm text-muted-foreground">{project.brands?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/projects/${id}/room`}>
              <Button variant="outline" size="sm">
                <DoorOpen className="mr-2 h-4 w-4" />
                Room
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </Button>
          </div>
        </div>

        {/* Content based on project type */}
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">
              <LayoutList className="mr-2 h-4 w-4" />
              Tasks
            </TabsTrigger>
            {showBoard && <TabsTrigger value="board">Board</TabsTrigger>}
            {showPhases && <TabsTrigger value="phases">Phases</TabsTrigger>}
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="meetings">
              <Video className="mr-2 h-4 w-4" />
              Meetings
            </TabsTrigger>
            <TabsTrigger value="intake">
              <ClipboardList className="mr-2 h-4 w-4" />
              Intake & Briefs
            </TabsTrigger>
            <TabsTrigger value="emails">
              <Mail className="mr-2 h-4 w-4" />
              Emails
            </TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="chat" className="gap-1">
              <MessageCircle className="h-4 w-4" />
              Chat
              <UnreadBadge projectId={id} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ProjectOverview projectId={project.id} />
          </TabsContent>

          <TabsContent value="tasks" className="mt-6">
            <ProjectTaskBoard
              projectId={project.id}
              onOpenDrawer={(serviceType) => {
                setDrawerServiceType(serviceType)
                setDrawerOpen(true)
              }}
            />
          </TabsContent>

          {showBoard && (
            <TabsContent value="board" className="mt-6">
              <KanbanBoard projectId={project.id} />
            </TabsContent>
          )}

          {showPhases && (
            <TabsContent value="phases" className="mt-6">
              <PhaseTracker projectId={project.id} />
            </TabsContent>
          )}

          <TabsContent value="list" className="mt-6">
            <TaskListView projectId={project.id} />
          </TabsContent>

          <TabsContent value="meetings" className="mt-6">
            {projectMeetings && projectMeetings.length > 0 ? (
              <div className="space-y-3">
                {projectMeetings.map((meeting: any) => (
                  <Link key={meeting.id} href={`/meetings/${meeting.id}`} className="block">
                    <div className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-accent/50">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                        <Video className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{meeting.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-[10px]">
                            {MEETING_TYPE_LABELS[meeting.meeting_type as MeetingType] || meeting.meeting_type}
                          </Badge>
                          {meeting.scheduled_at && (
                            <span>
                              {new Date(meeting.scheduled_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {MEETING_STATUS_LABELS[meeting.status as MeetingStatus] || meeting.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
                <div className="text-center">
                  <Video className="h-8 w-8 mx-auto text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground mt-2">
                    No meetings for this project yet
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="intake" className="mt-6">
            <IntakeTab projectId={project.id} meetings={projectMeetings ?? []} />
          </TabsContent>

          <TabsContent value="emails" className="mt-6">
            <ProjectEmailTab projectId={project.id} brandId={project.brand_id} />
          </TabsContent>

          <TabsContent value="team" className="mt-6">
            <ProjectTeam projectId={project.id} />
          </TabsContent>

          <TabsContent value="chat" className="mt-6">
            <ChatPanel projectId={project.id} />
          </TabsContent>
        </Tabs>

        {/* Task Selection Drawer */}
        <TaskSelectionDrawer
          projectId={id}
          serviceType={drawerServiceType}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      </div>
    </>
  )
}
