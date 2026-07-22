'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

export default function SubscriptionsPage() {
  const [search, setSearch] = useState('')
  const utils = trpc.useUtils()

  const { data, isLoading } = trpc.superAdmin.listOrganizations.useQuery({
    search: search || undefined,
    limit: 100,
    offset: 0,
  })

  const overrideMutation = trpc.superAdmin.overrideSubscription.useMutation({
    onSuccess: () => {
      utils.superAdmin.listOrganizations.invalidate()
      toast.success('Subscription updated')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <>
      <TopBar title="Subscriptions" />
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
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-muted-foreground text-sm p-6">Loading...</p>
            ) : (
              <div className="divide-y">
                <div className="grid grid-cols-5 gap-4 p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Organization</span>
                  <span>Members</span>
                  <span>Plan</span>
                  <span>Status</span>
                  <span>Override</span>
                </div>
                {data?.organizations.map((org) => {
                  const sub = org.subscriptions as {
                    plan?: string
                    status?: string
                  } | null
                  return (
                    <div
                      key={org.id}
                      className="grid grid-cols-5 gap-4 p-4 items-center"
                    >
                      <div>
                        <p className="font-medium text-sm">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.slug}
                        </p>
                      </div>
                      <span className="text-sm">{org.memberCount}</span>
                      <Badge variant="secondary">
                        {sub?.plan ?? 'starter'}
                      </Badge>
                      <Badge
                        variant={
                          sub?.status === 'active' ? 'outline' : 'secondary'
                        }
                      >
                        {sub?.status ?? 'no subscription'}
                      </Badge>
                      <Select
                        defaultValue={sub?.plan ?? 'starter'}
                        onValueChange={(plan) =>
                          overrideMutation.mutate({
                            orgId: org.id,
                            plan: plan as 'starter' | 'pro' | 'agency',
                          })
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="agency">Agency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
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
