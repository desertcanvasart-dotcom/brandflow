'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Users,
  Palette,
  FolderKanban,
  Ban,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import Link from 'next/link'

export default function OrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = use(params)
  const router = useRouter()
  const utils = trpc.useUtils()

  const { data: org, isLoading } = trpc.superAdmin.getOrganization.useQuery({
    orgId,
  })

  const toggleOrgMutation = trpc.superAdmin.toggleOrganization.useMutation({
    onSuccess: () => {
      utils.superAdmin.getOrganization.invalidate({ orgId })
      toast.success('Organization updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const overrideSubMutation = trpc.superAdmin.overrideSubscription.useMutation({
    onSuccess: () => {
      utils.superAdmin.getOrganization.invalidate({ orgId })
      toast.success('Subscription updated')
    },
    onError: (err) => toast.error(err.message),
  })

  const impersonateMutation = trpc.superAdmin.switchOrgContext.useMutation({
    onSuccess: () => {
      toast.success('Switched to organization context')
      router.push('/dashboard')
      router.refresh()
    },
    onError: (err) => toast.error(err.message),
  })

  const toggleUserMutation = trpc.superAdmin.toggleUser.useMutation({
    onSuccess: () => {
      utils.superAdmin.getOrganization.invalidate({ orgId })
      toast.success('User updated')
    },
    onError: (err) => toast.error(err.message),
  })

  if (isLoading) {
    return (
      <>
        <TopBar title="Organization" />
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </>
    )
  }

  if (!org) {
    return (
      <>
        <TopBar title="Organization" />
        <div className="p-6">
          <p className="text-muted-foreground">Organization not found</p>
        </div>
      </>
    )
  }

  const subscription = org.subscriptions as {
    plan?: string
    status?: string
  } | null

  return (
    <>
      <TopBar title={org.name} />
      <div className="p-6 space-y-6">
        {/* Back link */}
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Organizations
        </Link>

        {/* Org info + actions */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{org.name}</h2>
            <p className="text-muted-foreground">
              {org.slug} &middot; Created{' '}
              {new Date(org.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => impersonateMutation.mutate({ orgId })}
              disabled={impersonateMutation.isPending}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Impersonate
            </Button>
            <Button
              variant={org.is_disabled ? 'outline' : 'destructive'}
              onClick={() =>
                toggleOrgMutation.mutate({
                  orgId,
                  disabled: !org.is_disabled,
                })
              }
              disabled={toggleOrgMutation.isPending}
            >
              {org.is_disabled ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Enable
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-1" />
                  Disable
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex gap-2">
          {org.is_disabled ? (
            <Badge variant="destructive">Disabled</Badge>
          ) : (
            <Badge variant="outline" className="text-green-600 border-green-600">
              Active
            </Badge>
          )}
          <Badge variant="secondary">{subscription?.plan ?? 'starter'}</Badge>
          {subscription?.status && (
            <Badge variant="outline">{subscription.status}</Badge>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{org.members.length}</p>
                <p className="text-xs text-muted-foreground">Members</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{org.brands.length}</p>
                <p className="text-xs text-muted-foreground">Brands</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <FolderKanban className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{org.projectCount}</p>
                <p className="text-xs text-muted-foreground">Projects</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription override */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Plan:</span>
              <Select
                defaultValue={subscription?.plan ?? 'starter'}
                onValueChange={(plan) =>
                  overrideSubMutation.mutate({
                    orgId,
                    plan: plan as 'starter' | 'pro' | 'agency',
                  })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="agency">Agency</SelectItem>
                </SelectContent>
              </Select>
              {overrideSubMutation.isPending && (
                <span className="text-sm text-muted-foreground">Saving...</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Members list */}
        <Card>
          <CardHeader>
            <CardTitle>Members ({org.members.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {org.members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4"
                >
                  <div>
                    <p className="font-medium">
                      {member.display_name ?? 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {member.user_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{member.role}</Badge>
                    {!member.is_active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleUserMutation.mutate({
                          userId: member.user_id,
                          disabled: member.is_active,
                        })
                      }
                      disabled={toggleUserMutation.isPending}
                    >
                      {member.is_active ? (
                        <Ban className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Brands list */}
        {org.brands.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Brands ({org.brands.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {org.brands.map((brand) => (
                  <div
                    key={brand.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-medium">{brand.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {brand.slug}
                      </p>
                    </div>
                    {!brand.is_active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
