'use client'

import { useState, useCallback } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Brain, Loader2, Send, X } from 'lucide-react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'

interface KBAskProps {
  brandId?: string
}

const SUGGESTED_QUESTIONS = [
  'What are the brand guidelines?',
  'Summarize our content strategy',
  'What are the key customer personas?',
  'What SOPs do we have?',
]

export function KBAsk({ brandId }: KBAskProps) {
  const [question, setQuestion] = useState('')

  const { isLoading, completion, complete, setCompletion } = useCompletion({
    api: '/api/ai/ask-knowledge-base',
    streamProtocol: 'text',
    body: { brandId: brandId || undefined },
    onError: (err: Error) =>
      toast.error(err.message || 'Failed to search knowledge base'),
  })

  const handleAsk = useCallback(
    async (q?: string) => {
      const query = q || question
      if (!query.trim()) return
      setQuestion(query)
      await complete(query)
    },
    [question, complete]
  )

  const handleClear = useCallback(() => {
    setCompletion('')
    setQuestion('')
  }, [setCompletion])

  return (
    <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-purple-700 dark:text-purple-300">
          <Brain className="h-4 w-4" />
          Ask Knowledge Base
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask anything about your brands, strategy, or processes..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAsk()
              }
            }}
            disabled={isLoading}
            className="bg-white dark:bg-background"
          />
          <Button
            size="icon"
            onClick={() => handleAsk()}
            disabled={isLoading || !question.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Suggested questions */}
        {!completion && !isLoading && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleAsk(q)}
                className="text-xs text-muted-foreground bg-white dark:bg-muted px-2.5 py-1 rounded-full border hover:bg-muted/80 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Answer display */}
        {(completion || isLoading) && (
          <div className="relative rounded-lg border bg-white dark:bg-background p-4">
            {completion && !isLoading && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={handleClear}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {isLoading && !completion && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching knowledge base...
              </div>
            )}
            {completion && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{completion}</ReactMarkdown>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
