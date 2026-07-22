'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PLAN_CONFIGS } from '@/lib/constants'

const planKeys = ['starter', 'pro', 'agency'] as const

export function PricingSection() {
  const [annual, setAnnual] = useState(false)

  return (
    <section id="pricing" className="bg-background py-20 md:py-28 px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free. Scale as you grow. No hidden fees.
          </p>
        </div>

        {/* Annual/Monthly Toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex items-center rounded-full bg-muted p-1">
            <button
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                !annual
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setAnnual(false)}
            >
              Monthly
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                annual
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground'
              }`}
              onClick={() => setAnnual(true)}
            >
              Annual{' '}
              <span className="text-emerald-500 text-xs ml-1">-20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {planKeys.map((key) => {
            const plan = PLAN_CONFIGS[key]
            const isPro = key === 'pro'
            const monthlyPrice = plan.basePrice / 100
            const price = annual
              ? Math.round(monthlyPrice * 0.8)
              : monthlyPrice

            return (
              <div
                key={key}
                className={`rounded-2xl border bg-card p-6 md:p-8 space-y-6 ${
                  isPro ? 'ring-2 ring-indigo-500 relative' : ''
                }`}
              >
                {isPro && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">${price}</span>
                  {price > 0 && (
                    <span className="text-muted-foreground">/mo</span>
                  )}
                </div>
                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <Check className="h-4 w-4 text-indigo-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isPro ? (
                  <Button
                    className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0"
                    asChild
                  >
                    <Link href="/signup">Start Free Trial</Link>
                  </Button>
                ) : (
                  <Button
                    className="w-full rounded-full"
                    variant="outline"
                    asChild
                  >
                    <Link href="/signup">
                      {plan.basePrice === 0
                        ? 'Start Free'
                        : 'Start Free Trial'}
                    </Link>
                  </Button>
                )}
              </div>
            )
          })}
        </div>

        {/* Trust badges */}
        <div className="flex flex-col items-center gap-2 mt-8">
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              14-day free trial
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Cancel anytime
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              No credit card required
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
