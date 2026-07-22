'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Receipt, Download, ExternalLink } from 'lucide-react'
import { trpc } from '@/trpc/client'

const INVOICE_STATUS_COLORS: Record<string, string> = {
  paid: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  void: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  uncollectible:
    'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
}

function formatAmount(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export function BillingHistory() {
  const { data, isLoading } = trpc.billing.getBillingHistory.useQuery()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="h-5 w-5" />
          Billing History
        </CardTitle>
        <CardDescription>Your recent invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 animate-pulse"
              >
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted" />
                <div className="h-4 w-14 rounded bg-muted flex-1" />
                <div className="h-4 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : data?.invoices && data.invoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Invoice</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-sm">
                    {invoice.date
                      ? new Date(invoice.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {formatAmount(invoice.amount, invoice.currency)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${
                        INVOICE_STATUS_COLORS[invoice.status ?? ''] ??
                        INVOICE_STATUS_COLORS.draft
                      }`}
                    >
                      {invoice.status ?? 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {invoice.pdfUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a
                            href={invoice.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Download PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {invoice.hostedUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <a
                            href={invoice.hostedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View invoice"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No invoices yet
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Invoices will appear here after your first payment
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
