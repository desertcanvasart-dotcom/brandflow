'use client'

import { useState, useCallback } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { BarChart3, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { trpc } from '@/trpc/client'
import { AIOutputDisplay } from './ai-output-display'
import { BrandContextBanner } from './brand-context-banner'

type DateRange = '7d' | '30d' | '90d' | 'all'
type ReportFocus = 'overview' | 'content' | 'team'

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'all', label: 'All time' },
]

const REPORT_FOCUS_OPTIONS: { value: ReportFocus; label: string }[] = [
  { value: 'overview', label: 'Full Overview' },
  { value: 'content', label: 'Content Focus' },
  { value: 'team', label: 'Team Focus' },
]

export function PerformanceReport() {
  const [brandId, setBrandId] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('30d')
  const [reportFocus, setReportFocus] = useState<ReportFocus>('overview')
  const [variations, setVariations] = useState<string[]>([])
  const [activeVariation, setActiveVariation] = useState(0)

  const { data: brands } = trpc.brand.list.useQuery()

  const { isLoading, complete } = useCompletion({
    api: '/api/ai/performance-report',
    streamProtocol: 'text',
    body: {
      brandId: brandId !== 'all' ? brandId : undefined,
      dateRange,
      reportFocus,
    },
    onFinish: (_prompt, completion) => {
      setVariations((prev) => {
        const next = [...prev, completion]
        setActiveVariation(next.length - 1)
        return next.length > 5 ? next.slice(-5) : next
      })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate report'),
  })

  const handleGenerate = useCallback(async () => {
    await complete('Generate performance report')
  }, [complete])

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm font-medium">Performance Report</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Brand</Label>
          <Select value={brandId} onValueChange={setBrandId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Brands</SelectItem>
              {brands?.map((b) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {brandId && brandId !== 'all' && <BrandContextBanner brandId={brandId} />}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Report Focus</Label>
            <Select value={reportFocus} onValueChange={(v) => setReportFocus(v as ReportFocus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_FOCUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>

        <AIOutputDisplay
          variations={variations}
          activeVariation={activeVariation}
          onVariationChange={setActiveVariation}
          onClear={() => { setVariations([]); setActiveVariation(0) }}
          isStreaming={isLoading}
          agentType="performance_report"
          brandId={brandId !== 'all' ? brandId : undefined}
          inputSummary={`Report: ${reportFocus} (${dateRange})`}
          metadata={{ dateRange, reportFocus }}
        />
      </CardContent>
    </Card>
  )
}
