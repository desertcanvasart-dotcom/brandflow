'use client'

import { useState } from 'react'
import { Building2, Search, Ban, CheckCircle2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import Link from 'next/link'

export default function OrganizationsPage() {
  const [search, setSearch] = useState('')
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.superAdmin.listOrganizations.useQuery({
    search: search || undefined,
    limit: 50,
    offset: 0,
  })

  const toggleOrgMutation = trpc.superAdmin.toggleOrganization.useMutation({
    onSuccess: () => {
      utils.superAdmin.listOrganizations.invalidate()
      toast.success('Organization updated')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <>
      <TopBar title="Organizations" />
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {data?.total ?? 0} total
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-muted-foreground text-sm p-6">Loading...</p>
            ) : (
              <div className="divide-y">
                {data?.organizations.map((org) => (
                  <div
                    key={org.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Link
                      href={`/super-admin/organizations/${org.id}`}
                      className="flex items-center gap-3 flex-1"
                    >
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.slug} &middot; {org.memberCount} member
                          {org.memberCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {(org.subscriptions as { plan?: string } | null)?.plan ??
                          'starter'}
                      </Badge>
                      {org.is_disabled ? (
                        <Badge variant="destructive">Disabled</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground w-20 text-right">
                        {new Date(org.created_at).toLocaleDateString()}
                      </span>
                      <Button
                        variant={org.is_disabled ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() =>
                          toggleOrgMutation.mutate({
                            orgId: org.id,
                            disabled: !org.is_disabled,
                          })
                        }
                        disabled={toggleOrgMutation.isPending}
                      >
                        {org.is_disabled ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Enable
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5 mr-1" />
                            Disable
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
                {data?.organizations.length === 0 && (
                  <p className="text-muted-foreground text-sm p-6 text-center">
                    No organizations found
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
