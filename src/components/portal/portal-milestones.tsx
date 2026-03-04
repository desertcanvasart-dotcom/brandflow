'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FolderKanban } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { formatDate } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  on_hold: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
}

const PHASE_STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  skipped: 'bg-yellow-100 text-yellow-700',
}

export function PortalMilestones({ brandId }: { brandId: string }) {
  const { data: projects, isLoading } = trpc.portal.getProjectMilestones.useQuery({ brandId })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-5 w-48 rounded bg-muted" />
              <div className="mt-4 h-2 rounded bg-muted" />
              <div className="mt-4 space-y-2">
                <div className="h-4 w-32 rounded bg-muted" />
                <div className="h-4 w-40 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
        <div className="text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No projects yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Project milestones will appear here once your agency creates them.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {projects.map((project) => {
        const phases = project.phases ?? []
        const completedPhases = phases.filter((p) => p.status === 'completed').length
        const progress = phases.length > 0 ? Math.round((completedPhases / phases.length) * 100) : 0

        return (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{project.name}</CardTitle>
                  {project.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                  )}
                </div>
                <Badge className={STATUS_COLORS[project.status] ?? ''}>
                  {project.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{completedPhases} of {phases.length} phases complete</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            <CardContent>
              {phases.length > 0 ? (
                <div className="space-y-3">
                  {phases.map((phase, idx) => (
                    <div
                      key={phase.id}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium">
                        {idx + 1}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{phase.name}</span>
                          {phase.milestone_name && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              — {phase.milestone_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {phase.end_date && (
                            <span className="text-xs text-muted-foreground">
                              Due {formatDate(phase.end_date)}
                            </span>
                          )}
                          <Badge
                            variant="secondary"
                            className={`text-xs ${PHASE_STATUS_COLORS[phase.status] ?? ''}`}
                          >
                            {phase.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No phases defined for this project yet.
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
