'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, Save } from 'lucide-react'
import { trpc } from '@/trpc/client'
import { toast } from 'sonner'
import type { Database } from '@/types/database'

type BrandRow = Database['public']['Tables']['brands']['Row']

interface ColorEntry {
  name: string
  hex: string
  usage?: string
}

interface FontEntry {
  name: string
  url?: string
  usage?: string
}

export function BrandGuidelines({ brand }: { brand: BrandRow }) {
  const utils = trpc.useUtils()
  const initialColors = (brand.colors as unknown as ColorEntry[]) ?? []
  const initialFonts = (brand.fonts as unknown as FontEntry[]) ?? []

  const [colors, setColors] = useState<ColorEntry[]>(initialColors)
  const [fonts, setFonts] = useState<FontEntry[]>(initialFonts)
  const [hasChanges, setHasChanges] = useState(false)

  const updateMutation = trpc.brand.updateGuidelines.useMutation({
    onSuccess: () => {
      utils.brand.getById.invalidate({ id: brand.id })
      toast.success('Guidelines saved')
      setHasChanges(false)
    },
    onError: (err) => toast.error(err.message),
  })

  function addColor() {
    setColors([...colors, { name: '', hex: '#000000' }])
    setHasChanges(true)
  }

  function updateColor(index: number, field: keyof ColorEntry, value: string) {
    const updated = [...colors]
    updated[index] = { ...updated[index], [field]: value }
    setColors(updated)
    setHasChanges(true)
  }

  function removeColor(index: number) {
    setColors(colors.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  function addFont() {
    setFonts([...fonts, { name: '' }])
    setHasChanges(true)
  }

  function updateFont(index: number, field: keyof FontEntry, value: string) {
    const updated = [...fonts]
    updated[index] = { ...updated[index], [field]: value }
    setFonts(updated)
    setHasChanges(true)
  }

  function removeFont(index: number) {
    setFonts(fonts.filter((_, i) => i !== index))
    setHasChanges(true)
  }

  function handleSave() {
    updateMutation.mutate({
      id: brand.id,
      colors: colors.filter((c) => c.name && c.hex),
      fonts: fonts.filter((f) => f.name),
    })
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Colors */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Brand Colors</CardTitle>
          <Button variant="outline" size="sm" onClick={addColor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Color
          </Button>
        </CardHeader>
        <CardContent>
          {colors.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No colors defined. Add your brand colors above.
            </p>
          ) : (
            <div className="space-y-3">
              {colors.map((color, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={color.name}
                      onChange={(e) => updateColor(i, 'name', e.target.value)}
                      placeholder="e.g., Primary Blue"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Color</Label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={color.hex}
                        onChange={(e) => updateColor(i, 'hex', e.target.value)}
                        className="h-9 w-9 cursor-pointer rounded border p-0.5"
                      />
                      <Input
                        value={color.hex}
                        onChange={(e) => updateColor(i, 'hex', e.target.value)}
                        className="w-28"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Usage</Label>
                    <Input
                      value={color.usage ?? ''}
                      onChange={(e) => updateColor(i, 'usage', e.target.value)}
                      placeholder="e.g., Headlines, CTA buttons"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeColor(i)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fonts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Brand Fonts</CardTitle>
          <Button variant="outline" size="sm" onClick={addFont}>
            <Plus className="mr-2 h-4 w-4" />
            Add Font
          </Button>
        </CardHeader>
        <CardContent>
          {fonts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No fonts defined. Add your brand fonts above.
            </p>
          ) : (
            <div className="space-y-3">
              {fonts.map((font, i) => (
                <div key={i} className="flex items-end gap-3">
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Font Name</Label>
                    <Input
                      value={font.name}
                      onChange={(e) => updateFont(i, 'name', e.target.value)}
                      placeholder="e.g., Inter"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">URL (optional)</Label>
                    <Input
                      value={font.url ?? ''}
                      onChange={(e) => updateFont(i, 'url', e.target.value)}
                      placeholder="https://fonts.google.com/..."
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs">Usage</Label>
                    <Input
                      value={font.usage ?? ''}
                      onChange={(e) => updateFont(i, 'usage', e.target.value)}
                      placeholder="e.g., Body text, Headings"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeFont(i)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Guidelines'}
          </Button>
        </div>
      )}
    </div>
  )
}
