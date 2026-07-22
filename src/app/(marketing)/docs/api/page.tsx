import Link from 'next/link'
import { MarketingHeader } from '@/components/marketing/marketing-header'
import { MarketingFooter } from '@/components/marketing/marketing-footer'
import {
  Code2,
  Key,
  Globe,
  FileJson,
  ArrowLeft,
  Copy,
  BookOpen,
  Webhook,
} from 'lucide-react'

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/brands',
    description: 'List all brands in your organization',
    color: 'text-emerald-400 bg-emerald-400/10',
  },
  {
    method: 'POST',
    path: '/api/v1/brands',
    description: 'Create a new brand profile',
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    method: 'GET',
    path: '/api/v1/content',
    description: 'List content items with filtering and pagination',
    color: 'text-emerald-400 bg-emerald-400/10',
  },
  {
    method: 'POST',
    path: '/api/v1/content',
    description: 'Create a new content item or draft',
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    method: 'PUT',
    path: '/api/v1/content/:id/approve',
    description: 'Approve a content item for publishing',
    color: 'text-amber-400 bg-amber-400/10',
  },
  {
    method: 'GET',
    path: '/api/v1/projects',
    description: 'List all projects (content ops and web)',
    color: 'text-emerald-400 bg-emerald-400/10',
  },
  {
    method: 'POST',
    path: '/api/v1/webhooks',
    description: 'Register a webhook endpoint',
    color: 'text-blue-400 bg-blue-400/10',
  },
  {
    method: 'DELETE',
    path: '/api/v1/webhooks/:id',
    description: 'Remove a webhook subscription',
    color: 'text-red-400 bg-red-400/10',
  },
]

const sections = [
  {
    icon: Key,
    title: 'Authentication',
    description:
      'All API requests require a Bearer token. Generate API keys from your organization settings.',
  },
  {
    icon: Globe,
    title: 'Base URL',
    description:
      'All endpoints are served from https://api.agencybeats.app/v1 with TLS 1.3 encryption.',
  },
  {
    icon: FileJson,
    title: 'Request Format',
    description:
      'Send JSON payloads with Content-Type: application/json. Responses follow the JSON:API specification.',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description:
      'Receive real-time notifications for content approvals, project updates, and brand changes.',
  },
]

export default function ApiDocsPage() {
  return (
    <>
      <MarketingHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#0F172A] pt-32 pb-20">
          <div
            className="absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:64px_64px]"
            aria-hidden="true"
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full blur-3xl"
            style={{
              background:
                'radial-gradient(ellipse at center, rgba(99,102,241,0.15), rgba(168,85,247,0.08), transparent 70%)',
            }}
            aria-hidden="true"
          />

          <div className="relative mx-auto max-w-4xl px-4">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Documentation
            </Link>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <Code2 className="h-6 w-6 text-indigo-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                API Reference
              </h1>
            </div>
            <p className="text-lg text-slate-400 max-w-2xl">
              Integrate Agency Beats into your existing tools and automate your
              agency workflows with our REST API.
            </p>
          </div>
        </section>

        {/* Overview Cards */}
        <section className="bg-background py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <div
                    key={section.title}
                    className="rounded-xl border border-border bg-card p-5"
                  >
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mb-3">
                      <Icon className="h-4.5 w-4.5 text-indigo-500" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">
                      {section.title}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Code Example */}
        <section className="bg-background pb-8">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-xl font-bold mb-4">Quick Start</h2>
            <div className="rounded-xl bg-[#111827] border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/60" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/60" />
                  <span className="h-3 w-3 rounded-full bg-green-500/60" />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </div>
              </div>
              <pre className="p-5 text-sm text-slate-300 overflow-x-auto">
                <code>{`curl -X GET https://api.agencybeats.app/v1/brands \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# Response
{
  "data": [
    {
      "id": "brand_abc123",
      "name": "Acme Corp",
      "status": "active",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "per_page": 25
  }
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* Endpoints List */}
        <section className="bg-background py-8 pb-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-xl font-bold mb-4">Endpoints</h2>
            <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
              {endpoints.map((endpoint) => (
                <div
                  key={`${endpoint.method}-${endpoint.path}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={`inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-mono font-bold ${endpoint.color}`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm font-mono text-foreground">
                    {endpoint.path}
                  </code>
                  <span className="text-sm text-muted-foreground ml-auto hidden sm:block">
                    {endpoint.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Help CTA */}
        <section className="bg-[#0F172A] py-16">
          <div className="mx-auto max-w-4xl px-4 text-center">
            <BookOpen className="h-8 w-8 text-indigo-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white">
              Need help with integration?
            </h2>
            <p className="mt-3 text-slate-400">
              Check out our SDKs or reach out to our developer support team.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#"
                className="inline-flex items-center justify-center bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full px-6 py-2.5 text-sm font-medium hover:shadow-lg hover:shadow-indigo-500/25 transition-all"
              >
                View SDKs
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center border border-slate-600 text-slate-300 hover:border-indigo-400 hover:text-white rounded-full px-6 py-2.5 text-sm font-medium transition-all"
              >
                Developer Support
              </a>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </>
  )
}
