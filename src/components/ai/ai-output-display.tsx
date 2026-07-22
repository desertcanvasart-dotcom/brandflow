'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Button } from '@/components/ui/button'
import { Copy, Check, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AIOutputActions } from './ai-output-actions'
import type { AIOutputType } from '@/types/enums'

interface AIOutputDisplayProps {
  variations: string[]
  activeVariation: number
  onVariationChange: (idx: number) => void
  onClear: () => void
  isStreaming: boolean
  agentType: AIOutputType
  brandId?: string
  inputSummary: string
  metadata?: Record<string, unknown>
}

export function AIOutputDisplay({
  variations,
  activeVariation,
  onVariationChange,
  onClear,
  isStreaming,
  agentType,
  brandId,
  inputSummary,
  metadata,
}: AIOutputDisplayProps) {
  const [copied, setCopied] = useState(false)

  if (variations.length === 0) return null

  const currentText = variations[activeVariation] ?? ''

  async function handleCopy() {
    if (!currentText) return
    await navigator.clipboard.writeText(currentText)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="border-t mt-6 pt-6 space-y-3">
      {/* Variation tabs + copy */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {variations.length > 1 &&
            variations.map((_, i) => (
              <button
                key={i}
                onClick={() => onVariationChange(i)}
                className={cn(
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-colors',
                  i === activeVariation
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80',
                )}
              >
                V{i + 1}
              </button>
            ))}
          {variations.length > 1 && (
            <span className="text-xs text-muted-foreground ml-2">
              {variations.length} variation{variations.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={onClear} className="h-7 gap-1.5 text-muted-foreground">
            <Trash2 className="h-3.5 w-3.5" />
            <span className="text-xs">Clear</span>
          </Button>
        </div>
      </div>

      {/* Markdown output */}
      <div className="rounded-lg border bg-muted/30 p-4 max-h-[600px] overflow-y-auto">
        <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-sm prose-headings:font-semibold prose-p:text-sm prose-li:text-sm prose-strong:text-foreground">
          <ReactMarkdown>{currentText}</ReactMarkdown>
        </div>

        {!isStreaming && (
          <AIOutputActions
            outputText={currentText}
            agentType={agentType}
            brandId={brandId}
            inputSummary={inputSummary}
            metadata={metadata}
          />
        )}
      </div>
    </div>
  )
}
