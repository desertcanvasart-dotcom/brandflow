'use client'

import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { ServiceBriefForm } from './service-brief-form'
import type { Database } from '@/types/database'

type IntakeRow = Database['public']['Tables']['project_intake']['Row']

interface ServiceBriefsListProps {
  projectId: string
  intake: IntakeRow
}

export function ServiceBriefsList({ projectId, intake }: ServiceBriefsListProps) {
  const utils = trpc.useUtils()

  const { data: briefs, isLoading } = trpc.intake.listBriefs.useQuery({ projectId })

  const generateAllMutation = trpc.intake.generateAllBriefs.useMutation({
    onSuccess: (result) => {
      utils.intake.listBriefs.invalidate({ projectId })
      toast.success(`Generated ${result.generated} brief(s)`)
    },
    onError: (err) => toast.error(err.message),
  })

  const approvedCount = briefs?.filter((b) => b.status === 'approved' || b.status === 'active').length ?? 0
  const totalCount = briefs?.length ?? 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Service Briefs</h3>
          {totalCount > 0 && (
            <Badge variant="outline">
              {approvedCount}/{totalCount} approved
            </Badge>
          )}
        </div>
        {intake.status === 'approved' && (
          <Button
            onClick={() =>
              generateAllMutation.mutate({
                intakeId: intake.id,
                projectId,
              })
            }
            disabled={generateAllMutation.isPending}
            size="sm"
          >
            {generateAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {totalCount === 0 ? 'Generate All Briefs' : 'Generate Missing Briefs'}
          </Button>
        )}
      </div>

      {/* Progress */}
      {totalCount > 0 && (
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all"
            style={{ width: `${totalCount > 0 ? (approvedCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Generation in progress */}
      {generateAllMutation.isPending && (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating briefs... This may take a moment.
        </div>
      )}

      {/* Brief cards */}
      {briefs && briefs.length > 0 ? (
        <div className="space-y-4">
          {briefs.map((brief) => (
            <ServiceBriefForm key={brief.id} brief={brief} projectId={projectId} />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-8">
          <div className="text-center">
            <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mt-2">
              {intake.status === 'approved'
                ? 'No briefs generated yet. Click "Generate All Briefs" to start.'
                : 'Approve the intake first, then generate service briefs.'}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
