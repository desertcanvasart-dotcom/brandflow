'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Twitter, Github, Linkedin } from 'lucide-react'
import { toast } from 'sonner'

const footerColumns = [
  {
    title: 'Product',
    links: [
      // Root-relative: the footer renders on inner pages, where a bare
      // "#features" would resolve against the current path.
      { label: 'Features', href: '/#features' },
      { label: 'Workflow', href: '/#workflow' },
      { label: 'AI Agents', href: '/#ai-agents' },
      { label: 'Analytics', href: '/#analytics' },
      { label: 'Pricing', href: '/#pricing' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'User Walkthrough', href: '/guide/walkthrough' },
      { label: 'Client Portal Guide', href: '/guide/client-portal' },
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
  },
]

export function MarketingFooter() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      toast.success("You're subscribed!")
      setEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <footer className="bg-[#0F172A] text-white py-16 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Top: Logo & description */}
        <div>
          <Link href="/" className="shrink-0">
            <img src="/logo.png" alt="Agency Beats" className="h-[72px] w-auto rounded-md" />
          </Link>
          <p className="mt-2 text-sm text-slate-400 max-w-xs">
            The complete brand management platform for agencies.
          </p>
        </div>

        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-8">
          {footerColumns.map((column) => (
            <div key={column.title} className="space-y-3">
              <h4 className="text-sm font-semibold text-white">
                {column.title}
              </h4>
              <ul className="space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <form
          onSubmit={handleSubscribe}
          className="mt-12 flex flex-col sm:flex-row items-center gap-3 max-w-md"
        >
          <div className="flex-1 w-full">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <div className="flex h-10 w-full rounded-full bg-white/5 border border-white/10 px-4 items-center focus-within:border-white/30 transition-colors">
              <Mail className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-5 py-2.5 text-sm font-medium shrink-0 disabled:opacity-60"
          >
            {submitting ? 'Subscribing…' : 'Subscribe'}
          </button>
        </form>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; 2026 Agency Beats. All rights reserved.
          </p>
          {/* No live social accounts yet — icons are inert rather than
              linking to a "#" placeholder or a profile that doesn't exist. */}
          <div className="flex items-center gap-4">
            <span
              aria-label="Twitter (coming soon)"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-50 cursor-not-allowed"
            >
              <Twitter className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
            <span
              aria-label="GitHub (coming soon)"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-50 cursor-not-allowed"
            >
              <Github className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
            <span
              aria-label="LinkedIn (coming soon)"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center opacity-50 cursor-not-allowed"
            >
              <Linkedin className="h-4 w-4 text-slate-400" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
