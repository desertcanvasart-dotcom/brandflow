'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Search, Loader2, FileText, MessageSquare, BookOpen, Briefcase } from 'lucide-react'
import { trpc } from '@/trpc/client'
import type { EmbeddingSourceType } from '@/types/enums'

const SOURCE_TYPES = [
  { value: 'all', label: 'All Sources' },
  { value: 'meeting_transcript', label: 'Transcripts' },
  { value: 'content_item', label: 'Content' },
  { value: 'brief', label: 'Briefs' },
  { value: 'brand_guidelines', label: 'Guidelines' },
]

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  meeting_transcript: <MessageSquare className="h-4 w-4" />,
  content_item: <FileText className="h-4 w-4" />,
  brief: <Briefcase className="h-4 w-4" />,
  brand_guidelines: <BookOpen className="h-4 w-4" />,
}

interface SemanticSearchProps {
  className?: string
}

export function SemanticSearch({ className }: SemanticSearchProps) {
  const [query, setQuery] = useState('')
  const [sourceType, setSourceType] = useState('all')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [submittedSourceType, setSubmittedSourceType] = useState<EmbeddingSourceType | undefined>(undefined)

  const { data: results, isLoading } = trpc.search.semantic.useQuery(
    {
      query: submittedQuery,
      sourceType: submittedSourceType,
      limit: 10,
    },
    { enabled: submittedQuery.length > 0 }
  )

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    setSubmittedQuery(query.trim())
    setSubmittedSourceType(
      sourceType === 'all' ? undefined : (sourceType as EmbeddingSourceType)
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-orange-500" />
          <CardTitle className="text-sm font-medium">Semantic Search</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search across all brand content..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCE_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={isLoading || !query.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </form>

        {results && results.length > 0 ? (
          <div className="space-y-2">
            {results.map((result: any, i: number) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 mb-1">
                  {SOURCE_ICONS[result.source_type] || <FileText className="h-4 w-4" />}
                  <Badge variant="outline" className="text-xs">
                    {result.source_type?.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {Math.round((result.similarity || 0) * 100)}% match
                  </span>
                </div>
                <p className="text-sm line-clamp-3">{result.content}</p>
              </div>
            ))}
          </div>
        ) : results && results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No results found. Try a different query.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
