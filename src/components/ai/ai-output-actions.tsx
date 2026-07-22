'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Bookmark, X, Star, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import type { AIOutputType } from '@/types/enums'
import { cn } from '@/lib/utils'

interface AIOutputActionsProps {
  outputText: string
  agentType: AIOutputType
  brandId?: string
  inputSummary: string
  metadata?: Record<string, unknown>
}

export function AIOutputActions({
  outputText,
  agentType,
  brandId,
  inputSummary,
  metadata,
}: AIOutputActionsProps) {
  const [outputId, setOutputId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saved' | 'discarded'>('idle')
  const [rating, setRating] = useState<number>(0)
  const [hoveredStar, setHoveredStar] = useState<number>(0)
  const [savedToBrand, setSavedToBrand] = useState(false)

  const { data: brand } = trpc.brand.getById.useQuery(
    { id: brandId! },
    { enabled: !!brandId },
  )

  const saveMutation = trpc.aiOutput.save.useMutation()
  const updateStatusMutation = trpc.aiOutput.updateStatus.useMutation()
  const rateMutation = trpc.aiOutput.rate.useMutation()
  const updateGuidelinesMutation = trpc.brand.updateGuidelines.useMutation()

  async function ensureSaved(): Promise<string | null> {
    if (outputId) return outputId

    try {
      const result = await saveMutation.mutateAsync({
        brandId: brandId || undefined,
        agentType,
        inputSummary,
        outputText,
        metadata,
      })
      setOutputId(result.id)
      return result.id
    } catch {
      toast.error('Failed to save output')
      return null
    }
  }

  async function handleSave() {
    const id = await ensureSaved()
    if (!id) return

    try {
      await updateStatusMutation.mutateAsync({ id, status: 'saved' })
      setStatus('saved')
      toast.success('Output saved — it will improve future generations')
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleDiscard() {
    const id = await ensureSaved()
    if (!id) return

    try {
      await updateStatusMutation.mutateAsync({ id, status: 'discarded' })
      setStatus('discarded')
      toast.success('Output discarded — we\'ll avoid this pattern')
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handleRate(value: number) {
    const id = await ensureSaved()
    if (!id) return

    try {
      await rateMutation.mutateAsync({ id, rating: value })
      setRating(value)
      toast.success(`Rated ${value}/5`)
    } catch {
      toast.error('Failed to save rating')
    }
  }

  async function handleSaveToBrand() {
    if (!brandId) return

    try {
      const existingGuidelines = (brand?.guidelines as Record<string, unknown>) ?? {}
      const mergedGuidelines = {
        ...existingGuidelines,
        [`ai_${agentType}_${Date.now()}`]: {
          text: outputText.slice(0, 2000),
          source: agentType,
          savedAt: new Date().toISOString(),
        },
      }
      await updateGuidelinesMutation.mutateAsync({
        id: brandId,
        guidelines: mergedGuidelines,
      })
      setSavedToBrand(true)
      toast.success('Saved to brand notes')
    } catch {
      toast.error('Failed to save to brand')
    }
  }

  const isBusy =
    saveMutation.isPending ||
    updateStatusMutation.isPending ||
    rateMutation.isPending ||
    updateGuidelinesMutation.isPending

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 border-t mt-2">
      {/* Save / Discard */}
      <Button
        variant={status === 'saved' ? 'default' : 'ghost'}
        size="sm"
        onClick={handleSave}
        disabled={isBusy || status === 'saved'}
        className="gap-1.5"
      >
        <Bookmark className={cn('h-3.5 w-3.5', status === 'saved' && 'fill-current')} />
        {status === 'saved' ? 'Saved' : 'Save'}
      </Button>

      <Button
        variant={status === 'discarded' ? 'destructive' : 'ghost'}
        size="sm"
        onClick={handleDiscard}
        disabled={isBusy || status === 'discarded'}
        className="gap-1.5"
      >
        <X className="h-3.5 w-3.5" />
        {status === 'discarded' ? 'Discarded' : 'Discard'}
      </Button>

      {/* Save to Brand */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveToBrand}
              disabled={isBusy || !brandId || savedToBrand}
              className="gap-1.5"
            >
              <FileText className={cn('h-3.5 w-3.5', savedToBrand && 'text-green-500')} />
              {savedToBrand ? 'Saved to Brand' : 'Save to Brand'}
            </Button>
          </TooltipTrigger>
          {!brandId && (
            <TooltipContent>
              <p>Select a brand first</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      {/* Star rating */}
      <div className="ml-auto flex items-center gap-0.5">
        <span className="text-xs text-muted-foreground mr-1">Rate:</span>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => handleRate(value)}
            onMouseEnter={() => setHoveredStar(value)}
            onMouseLeave={() => setHoveredStar(0)}
            disabled={isBusy}
            className="p-0.5 hover:scale-110 transition-transform disabled:opacity-50"
          >
            <Star
              className={cn(
                'h-3.5 w-3.5 transition-colors',
                (hoveredStar >= value || rating >= value)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/40',
              )}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
