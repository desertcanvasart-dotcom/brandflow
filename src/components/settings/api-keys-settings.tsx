'use client'

import { useState } from 'react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Key, Plus, Copy, Loader2, AlertTriangle, Trash2 } from 'lucide-react'

export function ApiKeysSettings() {
  const utils = trpc.useUtils()

  const { data: apiKeys, isLoading } = trpc.settings.listApiKeys.useQuery()

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [keyName, setKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)

  // Revoke dialog
  const [revokeId, setRevokeId] = useState<string | null>(null)

  const generateMutation = trpc.settings.generateApiKey.useMutation({
    onSuccess: (data) => {
      setCreatedKey(data.fullKey)
      setKeyName('')
      utils.settings.listApiKeys.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  const revokeMutation = trpc.settings.revokeApiKey.useMutation({
    onSuccess: () => {
      toast.success('API key revoked')
      setRevokeId(null)
      utils.settings.listApiKeys.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!keyName.trim()) return
    generateMutation.mutate({ name: keyName.trim() })
  }

  function copyKey() {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      toast.success('API key copied')
    }
  }

  const activeKeys = apiKeys?.filter((k) => !k.is_revoked) ?? []
  const revokedKeys = apiKeys?.filter((k) => k.is_revoked) ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4 text-muted-foreground" />
                API Keys
              </CardTitle>
              <CardDescription className="mt-1">
                Generate and manage API keys for programmatic access
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : activeKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No API keys yet. Generate one to get started.
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeKeys.map((key) => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium text-sm">{key.name}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                          {key.key_prefix}...
                        </code>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(key.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {key.last_used_at
                          ? new Date(key.last_used_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : 'Never'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => setRevokeId(key.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {revokedKeys.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Revoked Keys
              </p>
              <div className="space-y-1">
                {revokedKeys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center gap-3 text-sm text-muted-foreground py-1.5"
                  >
                    <span className="line-through">{key.name}</span>
                    <Badge variant="secondary" className="text-[10px]">Revoked</Badge>
                    <span className="text-xs">
                      {key.revoked_at
                        ? new Date(key.revoked_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) {
            setCreatedKey(null)
            setKeyName('')
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createdKey ? 'API Key Created' : 'Generate API Key'}
            </DialogTitle>
            <DialogDescription>
              {createdKey
                ? 'Copy your key now. You won\'t be able to see it again.'
                : 'Give your key a descriptive name to identify its purpose.'}
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">
                  This is the only time you&apos;ll see this key. Copy it now and store it securely.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  value={createdKey}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button variant="outline" size="icon" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setCreateOpen(false)
                  setCreatedKey(null)
                }}
              >
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="key-name">Key Name</Label>
                <Input
                  id="key-name"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g., Production API, CI Pipeline"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Generating...
                    </>
                  ) : (
                    'Generate'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Any applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => revokeId && revokeMutation.mutate({ id: revokeId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
