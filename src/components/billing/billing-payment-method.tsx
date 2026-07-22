'use client'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Plus, ExternalLink } from 'lucide-react'
import { trpc } from '@/trpc/client'

const CARD_BRANDS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  amex: 'Amex',
  discover: 'Discover',
  diners: 'Diners',
  jcb: 'JCB',
  unionpay: 'UnionPay',
}

interface BillingPaymentMethodProps {
  nextBillingDate: string | null
  isAdmin: boolean
  onManageBilling: () => void
  manageLoading: boolean
}

export function BillingPaymentMethod({
  nextBillingDate,
  isAdmin,
  onManageBilling,
  manageLoading,
}: BillingPaymentMethodProps) {
  const { data: paymentMethod, isLoading } =
    trpc.billing.getPaymentMethod.useQuery()

  const formattedDate = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5" />
          Payment Method
        </CardTitle>
        <CardDescription>Your billing information</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 w-40 rounded bg-muted" />
            <div className="h-4 w-28 rounded bg-muted" />
          </div>
        ) : paymentMethod ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-14 items-center justify-center rounded-md border bg-muted/50">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {CARD_BRANDS[paymentMethod.brand] ?? paymentMethod.brand} ····{' '}
                  {paymentMethod.last4}
                </p>
                <p className="text-xs text-muted-foreground">
                  Expires {String(paymentMethod.expMonth).padStart(2, '0')}/
                  {paymentMethod.expYear}
                </p>
              </div>
            </div>

            {formattedDate && (
              <div className="rounded-md bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">
                  Next charge
                </p>
                <p className="text-sm font-medium">{formattedDate}</p>
              </div>
            )}

            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={onManageBilling}
                disabled={manageLoading}
                className="w-full"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2" />
                {manageLoading ? 'Loading...' : 'Update Payment Method'}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-3">
              <CreditCard className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No payment method on file
            </p>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={onManageBilling}
                disabled={manageLoading}
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                {manageLoading ? 'Loading...' : 'Add Payment Method'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
