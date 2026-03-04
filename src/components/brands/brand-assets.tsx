'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Plus, Search, FileIcon, ImageIcon, VideoIcon, FileText, Trash2 } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { useFileUpload } from '@/hooks/use-file-upload'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type AssetType = Database['public']['Enums']['asset_type']

const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  logo: 'Logo',
  image: 'Image',
  video: 'Video',
  document: 'Document',
  font: 'Font',
  icon: 'Icon',
  template: 'Template',
  other: 'Other',
}

const ASSET_TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  logo: <ImageIcon className="h-8 w-8" />,
  image: <ImageIcon className="h-8 w-8" />,
  video: <VideoIcon className="h-8 w-8" />,
  document: <FileText className="h-8 w-8" />,
  font: <FileText className="h-8 w-8" />,
  icon: <ImageIcon className="h-8 w-8" />,
  template: <FileIcon className="h-8 w-8" />,
  other: <FileIcon className="h-8 w-8" />,
}

export function BrandAssets({ brandId }: { brandId: string }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<AssetType | 'all'>('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [newAssetName, setNewAssetName] = useState('')
  const [newAssetType, setNewAssetType] = useState<AssetType>('image')

  const utils = trpc.useUtils()
  const { data: assets, isLoading } = trpc.asset.list.useQuery({
    brandId,
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: search || undefined,
  })

  const { upload, uploading: isUploading } = useFileUpload()

  const createMutation = trpc.asset.create.useMutation({
    onSuccess: () => {
      utils.asset.list.invalidate()
      toast.success('Asset uploaded')
      setUploadOpen(false)
      setNewAssetName('')
    },
    onError: (err) => toast.error(err.message),
  })

  const deleteMutation = trpc.asset.delete.useMutation({
    onSuccess: () => {
      utils.asset.list.invalidate()
      toast.success('Asset deleted')
    },
    onError: (err) => toast.error(err.message),
  })

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const fileInput = document.getElementById('asset-file') as HTMLInputElement
    const file = fileInput?.files?.[0]
    if (!file || !newAssetName) return

    try {
      const url = await upload(file)
      createMutation.mutate({
        brandId,
        type: newAssetType,
        name: newAssetName,
        fileUrl: url,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      })
    } catch {
      toast.error('Upload failed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as AssetType | 'all')}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Asset</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={newAssetName}
                  onChange={(e) => setNewAssetName(e.target.value)}
                  placeholder="Asset name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newAssetType}
                  onValueChange={(v) => setNewAssetType(v as AssetType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ASSET_TYPE_LABELS) as [AssetType, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>File</Label>
                <Input id="asset-file" type="file" required />
              </div>
              <Button type="submit" disabled={isUploading || createMutation.isPending} className="w-full">
                {isUploading ? 'Uploading...' : createMutation.isPending ? 'Saving...' : 'Upload'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="aspect-square rounded bg-muted" />
                <div className="mt-3 h-4 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : assets && assets.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const isImage = asset.mime_type?.startsWith('image/')
            return (
              <Card key={asset.id} className="group relative overflow-hidden">
                <CardContent className="p-4">
                  {isImage && asset.file_url ? (
                    <div className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={asset.file_url}
                        alt={asset.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-square rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      {ASSET_TYPE_ICONS[asset.type]}
                    </div>
                  )}
                  <div className="mt-3">
                    <p className="text-sm font-medium truncate">{asset.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {ASSET_TYPE_LABELS[asset.type]}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => deleteMutation.mutate({ id: asset.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-12">
          <div className="text-center">
            <h3 className="text-lg font-medium">No assets yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload brand assets like logos, images, and documents
            </p>
            <Button className="mt-4" onClick={() => setUploadOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Asset
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
