'use client'

import { useState } from 'react'
import { Shield, Trash2, Plus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TopBar } from '@/components/layout/top-bar'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'

export default function PlatformAdminsPage() {
  const [newUserId, setNewUserId] = useState('')
  const [notes, setNotes] = useState('')
  const utils = trpc.useUtils()

  const { data: admins, isLoading } = trpc.superAdmin.listAdmins.useQuery()

  const addMutation = trpc.superAdmin.addAdmin.useMutation({
    onSuccess: () => {
      utils.superAdmin.listAdmins.invalidate()
      setNewUserId('')
      setNotes('')
      toast.success('Platform admin added')
    },
    onError: (err) => toast.error(err.message),
  })

  const removeMutation = trpc.superAdmin.removeAdmin.useMutation({
    onSuccess: () => {
      utils.superAdmin.listAdmins.invalidate()
      toast.success('Platform admin removed')
    },
    onError: (err) => toast.error(err.message),
  })

  return (
    <>
      <TopBar title="Platform Admins" />
      <div className="p-6 space-y-6">
        {/* Add new admin */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Platform Admin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">User ID</label>
                <Input
                  placeholder="Enter user UUID..."
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                />
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input
                  placeholder="Reason for granting access..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <Button
                onClick={() =>
                  addMutation.mutate({
                    userId: newUserId,
                    notes: notes || undefined,
                  })
                }
                disabled={!newUserId.trim() || addMutation.isPending}
              >
                <Shield className="h-4 w-4 mr-1" />
                Grant Access
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Current admins */}
        <Card>
          <CardHeader>
            <CardTitle>
              Current Platform Admins ({admins?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-muted-foreground text-sm p-6">Loading...</p>
            ) : (
              <div className="divide-y">
                {admins?.map((admin) => (
                  <div
                    key={admin.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="font-mono text-sm">{admin.user_id}</p>
                      <p className="text-xs text-muted-foreground">
                        Granted {new Date(admin.granted_at).toLocaleDateString()}
                        {admin.notes && ` — ${admin.notes}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        removeMutation.mutate({ userId: admin.user_id })
                      }
                      disabled={removeMutation.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                {admins?.length === 0 && (
                  <p className="text-muted-foreground text-sm p-6 text-center">
                    No platform admins configured
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
