'use client'

import { useState, useEffect, useRef } from 'react'
import { Building2, Save, Upload, Loader2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useCurrentUser } from '@/hooks/use-current-user'

export function OrganizationSettings() {
  const { orgId } = useCurrentUser()
  const utils = trpc.useUtils()
  const { upload, uploading } = useFileUpload()

  const { data: org, isLoading } = trpc.organization.get.useQuery()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  useEffect(() => {
    if (org) {
      setName(org.name ?? '')
      setLogoUrl(org.logo_url)
    }
  }, [org])

  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success('Organization updated')
      utils.organization.get.invalidate()
    },
    onError: (err) => toast.error(err.message),
  })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    try {
      const url = await upload(file, {
        folder: `org-assets/${orgId}`,
        maxSizeBytes: 5 * 1024 * 1024,
      })
      setLogoUrl(url)
      // Save immediately
      updateMutation.mutate({ logoUrl: url })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({
      name,
      logoUrl: logoUrl ?? undefined,
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Organization logo"
                    className="h-16 w-16 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Logo
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 5MB. Recommended: 256x256px.
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Organization name */}
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Organization ID */}
            <div className="space-y-2">
              <Label>Organization ID</Label>
              <Input value={org?.id ?? ''} disabled className="font-mono text-sm" />
              <p className="text-xs text-muted-foreground">
                Used for API integrations
              </p>
            </div>

            <Button type="submit" disabled={updateMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
