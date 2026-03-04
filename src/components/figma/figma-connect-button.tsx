'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { trpc } from '@/trpc/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Paintbrush, ExternalLink, Unlink, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

export function FigmaConnectButton() {
  const searchParams = useSearchParams()
  const [newTeamId, setNewTeamId] = useState('')

  const { data: connection, isLoading } = trpc.figma.getConnection.useQuery()
  const utils = trpc.useUtils()

  const disconnectMutation = trpc.figma.disconnect.useMutation({
    onSuccess: () => {
      toast.success('Figma account disconnected')
      utils.figma.getConnection.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to disconnect: ${error.message}`)
    },
  })

  const updateTeamIdsMutation = trpc.figma.updateTeamIds.useMutation({
    onSuccess: () => {
      toast.success('Team IDs updated')
      utils.figma.getConnection.invalidate()
    },
    onError: (error) => {
      toast.error(`Failed to update team IDs: ${error.message}`)
    },
  })

  useEffect(() => {
    if (searchParams.get('figma') === 'connected') {
      toast.success('Figma account connected successfully!')
    }
  }, [searchParams])

  const handleAddTeamId = () => {
    const trimmed = newTeamId.trim()
    if (!trimmed) return

    const currentIds = connection?.figma_team_ids ?? []
    if (currentIds.includes(trimmed)) {
      toast.error('This team ID has already been added')
      return
    }

    updateTeamIdsMutation.mutate({ teamIds: [...currentIds, trimmed] })
    setNewTeamId('')
  }

  const handleRemoveTeamId = (teamIdToRemove: string) => {
    const currentIds = connection?.figma_team_ids ?? []
    updateTeamIdsMutation.mutate({
      teamIds: currentIds.filter((id) => id !== teamIdToRemove),
    })
  }

  const handleDisconnect = () => {
    disconnectMutation.mutate()
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    )
  }

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Figma Integration
          </CardTitle>
          <CardDescription>
            Connect your Figma account to import designs directly into deliverables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => {
              window.location.href = '/api/auth/figma'
            }}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Connect Figma
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5" />
            Figma Integration
          </CardTitle>
          <Badge variant="outline" className="border-green-500 text-green-600">
            Connected
          </Badge>
        </div>
        <CardDescription>
          Connected as <span className="font-medium">{connection.figma_user_name}</span>
          {connection.figma_email && (
            <span className="ml-1 text-muted-foreground">({connection.figma_email})</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Figma Team IDs</Label>
            <p className="text-xs text-muted-foreground">
              Add your Figma team IDs to browse projects and files
            </p>
          </div>

          {connection.figma_team_ids && connection.figma_team_ids.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {connection.figma_team_ids.map((teamId) => (
                <Badge key={teamId} variant="secondary" className="gap-1">
                  {teamId}
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamId(teamId)}
                    className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    disabled={updateTeamIdsMutation.isPending}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Input
              placeholder="Enter team ID"
              value={newTeamId}
              onChange={(e) => setNewTeamId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddTeamId()
                }
              }}
              className="h-8 text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleAddTeamId}
              disabled={!newTeamId.trim() || updateTeamIdsMutation.isPending}
            >
              <Plus className="mr-1 h-3 w-3" />
              Add
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={handleDisconnect}
          disabled={disconnectMutation.isPending}
        >
          <Unlink className="mr-2 h-4 w-4" />
          {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
        </Button>
      </CardContent>
    </Card>
  )
}
