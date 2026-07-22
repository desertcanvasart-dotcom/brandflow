'use client'

import { Badge } from '@/components/ui/badge'
import { CreditCard, Calendar, Clock, Users } from 'lucide-react'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  trialing: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  past_due: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  canceled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  incomplete: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  unpaid: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  paused: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  free: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
}

interface BillingStatsBarProps {
  planName: string
  status: string
  nextBillingDate: string | null
  trialDaysRemaining: number | null
  memberCount?: number
}

export function BillingStatsBar({
  planName,
  status,
  nextBillingDate,
  trialDaysRemaining,
  memberCount,
}: BillingStatsBarProps) {
  const formattedDate = nextBillingDate
    ? new Date(nextBillingDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  const statusLabel = status.replace('_', ' ')

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Current Plan */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex-shrink-0 text-purple-500">
          <CreditCard className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-none">{planName}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`text-xs ${STATUS_COLORS[status] ?? STATUS_COLORS.free}`}>
              {statusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Next Billing Date */}
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
        <div className="flex-shrink-0 text-blue-500">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <p className="text-lg font-semibold leading-none">
            {formattedDate ?? 'Free plan'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formattedDate ? 'Next billing date' : 'No billing cycle'}
          </p>
        </div>
      </div>

      {/* Trial or Team Members */}
      {trialDaysRemaining !== null ? (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950 p-4">
          <div className="flex-shrink-0 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none text-amber-800 dark:text-amber-200">
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Trial remaining
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <div className="flex-shrink-0 text-green-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold leading-none">
              {memberCount ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Team members
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
