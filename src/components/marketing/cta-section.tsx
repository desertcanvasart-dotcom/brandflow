import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTASection() {
  return (
    <section className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-20 md:py-28 px-4">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white">
          Run your agency smarter.
        </h2>
        <p className="mt-4 text-lg text-white/80">
          Start managing campaigns, clients, and performance in one platform.
        </p>
        <div className="mt-8">
          <Link
            href="/signup"
            className="bg-white text-[#0F172A] hover:bg-white/90 rounded-full px-8 py-3 text-lg font-medium inline-flex items-center gap-2"
          >
            Start Free Trial
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
        <p className="mt-4 text-sm text-white/60">
          Free plan available. No credit card required.
        </p>
      </div>
    </section>
  )
}
