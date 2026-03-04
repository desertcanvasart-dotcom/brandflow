'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
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
    platforms: ContentPlatform[]
  }
}

export function BrandForm({ brand }: BrandFormProps) {
  const router = useRouter()
  const utils = trpc.useUtils()

  const [name, setName] = useState(brand?.name ?? '')
  const [description, setDescription] = useState(brand?.description ?? '')
  const [websiteUrl, setWebsiteUrl] = useState(brand?.website_url ?? '')
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    if (brand) {
      updateMutation.mutate({
        id: brand.id,
        name,
        description,
        websiteUrl: websiteUrl || undefined,
        platforms,
      })
    } else {
      createMutation.mutate({
        name,
        description,
        websiteUrl: websiteUrl || undefined,
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
