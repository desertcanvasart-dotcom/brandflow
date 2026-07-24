'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, Upload, X } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import { useFileUpload } from '@/hooks/use-file-upload'
import { PLATFORM_LABELS } from '@/lib/constants'
import type { Database } from '@/types/database'

type ContentPlatform = Database['public']['Enums']['content_platform']

const ALL_PLATFORMS: ContentPlatform[] = [
  'instagram', 'facebook', 'twitter', 'linkedin',
  'tiktok', 'youtube', 'blog', 'newsletter', 'other',
]

interface BrandFormProps {
  brand?: {
    id: string
    name: string
    description: string | null
    website_url: string | null
    logo_url: string | null
    platforms: ContentPlatform[]
  }
}

export function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter()
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { upload, uploading } = useFileUpload()

  const [name, setName] = useState(brand?.name ?? '')
  const [description, setDescription] = useState(brand?.description ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(brand?.website_url ?? '')
  const [logoUrl, setLogoUrl] = useState<string | null>(brand?.logo_url ?? null)
  const [platforms, setPlatforms] = useState<ContentPlatform[]>(brand?.platforms ?? [])

  const createMutation = trpc.brand.create.useMutation({
    onSuccess: (data) => {
      utils.brand.list.invalidate()
      toast.success('Brand created successfully')
      router.push(`/brands/${data?.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const updateMutation = trpc.brand.update.useMutation({
    onSuccess: () => {
      utils.brand.list.invalidate()
      if (brand) utils.brand.getById.invalidate({ id: brand.id })
      toast.success('Brand updated successfully')
      router.push(`/brands/${brand?.id}`)
    },
    onError: (err) => toast.error(err.message),
  })

  const isSubmitting = createMutation.isPending || updateMutation.isPending

  function togglePlatform(platform: ContentPlatform) {
    setPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    try {
      const url = await upload(file, {
        folder: 'brand-logos',
        maxSizeBytes: 5 * 1024 * 1024,
      })
      setLogoUrl(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      // Allow re-selecting the same file after a failure
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (brand) {
      updateMutation.mutate({
        id: brand.id,
        name,
        description,
        websiteUrl: websiteUrl || undefined,
        logoUrl: logoUrl ?? '',
        platforms,
      })
    } else {
      createMutation.mutate({
        name,
        description,
        websiteUrl: websiteUrl || undefined,
        logoUrl: logoUrl ?? undefined,
        platforms,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Brand Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Acme Corp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the brand..."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Logo</Label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`${name || 'Brand'} logo`}
                  className="h-14 w-14 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border bg-muted text-lg font-bold text-muted-foreground">
                  {name.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      {logoUrl ? 'Replace' : 'Upload logo'}
                    </>
                  )}
                </Button>
                {logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setLogoUrl(null)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Platforms</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select the platforms this brand publishes content on
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_PLATFORMS.map((platform) => (
              <label
                key={platform}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={platforms.includes(platform)}
                  onCheckedChange={() => togglePlatform(platform)}
                />
                <span className="text-sm">{PLATFORM_LABELS[platform]}</span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? brand ? 'Updating...' : 'Creating...'
            : brand ? 'Update Brand' : 'Create Brand'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
