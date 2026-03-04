'use client'

import { useState, useEffect } from 'react'
import { TopBar } from '@/components/layout/top-bar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Building2, Save } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useCurrentUser } from '@/hooks/use-current-user'
import { toast } from 'sonner'
import { AutoAssignmentRules } from '@/components/settings/auto-assignment-rules'
import { NotificationPreferences } from '@/components/settings/notification-preferences'
import { FigmaConnectButton } from '@/components/figma/figma-connect-button'

export default function SettingsPage() {
  const { role } = useCurrentUser()
  const isAdmin = role === 'admin'
  const utils = trpc.useUtils()

  const { data: org, isLoading } = trpc.organization.get.useQuery()
  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success('Settings saved')
      utils.organization.get.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const [name, setName] = useState('')

  useEffect(() => {
    if (org) {
      setName(org.name ?? '')
    }
  }, [org])

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ name })
  }

  return (
    <>
      <TopBar title="Settings" />
      <div className="flex flex-col gap-6 p-6 max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
          <p className="text-muted-foreground">
            Manage your organization settings
          </p>
        </div>

        {isLoading ? (
          <Card className="animate-pulse">
            <CardHeader>
              <div className="h-5 w-40 rounded bg-muted" />
              <div className="h-4 w-64 rounded bg-muted mt-1" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="h-10 w-full rounded bg-muted" />
              <div className="h-10 w-full rounded bg-muted" />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Organization
                </CardTitle>
                <CardDescription>
                  Basic information about your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization name</Label>
                    <Input
                      id="org-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization ID</Label>
                    <Input value={org?.id ?? ''} disabled className="font-mono text-sm" />
                    <p className="text-xs text-muted-foreground">
                      Used for API integrations
                    </p>
                  </div>
                  {isAdmin && (
                    <Button type="submit" disabled={updateMutation.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
                </form>
              </CardContent>
            </Card>

            <Separator />

            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Your personal account details
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your role</Label>
                  <Input
                    value={role ? role.charAt(0).toUpperCase() + role.slice(1) : ''}
                    disabled
                  />
                </div>
              </CardContent>
            </Card>

            <Separator />

            {/* Integrations */}
            <FigmaConnectButton />

            <Separator />

            {/* Notification Preferences */}
            <NotificationPreferences />

            <Separator />

            {/* Auto-Assignment Rules (managers+ only) */}
            {(isAdmin || role === 'manager') && <AutoAssignmentRules />}
          </>
        )}
      </div>
    </>
  )
}
