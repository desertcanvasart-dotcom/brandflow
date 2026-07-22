'use client'

import { Building2, Users, CreditCard } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import Link from 'next/link'

export default function SuperAdminOverview() {
  const { data: stats, isLoading: statsLoading } =
    trpc.superAdmin.platformStats.useQuery()
  const { data: orgsData, isLoading: orgsLoading } =
    trpc.superAdmin.listOrganizations.useQuery({ limit: 10, offset: 0 })

  return (
    <>
      <TopBar title="Super Admin" />
      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Organizations
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalOrganizations}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Users
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalActiveUsers}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Subscriptions
              </CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? '...' : stats?.totalActiveSubscriptions}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Organizations</CardTitle>
            <Link
              href="/super-admin/organizations"
              className="text-sm text-muted-foreground hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {orgsLoading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : (
              <div className="divide-y">
                {orgsData?.organizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/super-admin/organizations/${org.id}`}
                    className="flex items-center justify-between py-3 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors"
                  >
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {org.is_disabled && (
                        <Badge variant="destructive">Disabled</Badge>
                      )}
                      <Badge variant="secondary">
                        {(org.subscriptions as { plan?: string } | null)?.plan ??
                          'starter'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                ))}
                {orgsData?.organizations.length === 0 && (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    No organizations yet
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
