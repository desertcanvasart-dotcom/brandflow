import Link from 'next/link'
import { Mail, Twitter, Github, Linkedin } from 'lucide-react'

const footerColumns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Workflow', href: '#workflow' },
      { label: 'AI Agents', href: '#ai-agents' },
      { label: 'Analytics', href: '#analytics' },
      { label: 'Pricing', href: '#pricing' },
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
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-3 max-w-md">
          <div className="flex-1 w-full">
            <div className="flex h-10 w-full rounded-full bg-white/5 border border-white/10 px-4 items-center">
              <Mail className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
              <span className="text-sm text-slate-500">Enter your email</span>
            </div>
          </div>
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-5 py-2.5 text-sm font-medium">
            Subscribe
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-400">
            &copy; 2026 Agency Beats. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="#"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Twitter className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="#"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Github className="h-4 w-4 text-slate-400" />
            </a>
            <a
              href="#"
              className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <Linkedin className="h-4 w-4 text-slate-400" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
