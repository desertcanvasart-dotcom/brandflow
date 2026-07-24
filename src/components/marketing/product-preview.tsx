'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Instagram,
  Linkedin,
  BookOpen,
  Clock,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'

const tabs = [
  { id: 'campaigns', label: 'Campaign Dashboard', icon: LayoutDashboard },
  { id: 'content', label: 'Content Workspace', icon: FileText },
  { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
] as const

type TabId = (typeof tabs)[number]['id']

function PulsingDot({ className, hint }: { className: string; hint: string }) {
  return (
    <span className={`absolute ${className} group/dot`} title={hint}>
      <span className="relative flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
        <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-400" />
      </span>
    </span>
  )
}

function CampaignDashboard() {
  return (
    <div className="relative">
      <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold text-lg">Campaign Overview</h3>
          <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 border border-indigo-500/30">
            March 2026
          </span>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4 space-y-1">
            <p className="text-xs text-indigo-300">Active Campaigns</p>
            <p className="text-2xl font-bold text-white">12</p>
          </div>
          <div className="rounded-xl bg-purple-500/10 border border-purple-500/20 p-4 space-y-1">
            <p className="text-xs text-purple-300">Tasks This Week</p>
            <p className="text-2xl font-bold text-white">34</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 space-y-1">
            <p className="text-xs text-emerald-300">Content Published</p>
            <p className="text-2xl font-bold text-white">89</p>
          </div>
        </div>

        {/* Kanban board */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* To Do */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-slate-400" />
              <span className="text-xs font-medium text-slate-400">To Do</span>
              <span className="ml-auto text-xs text-slate-500">3</span>
            </div>
            {['Brand guidelines update', 'Q2 content calendar', 'Social media audit'].map((item) => (
              <div
                key={item}
                className="rounded-lg bg-white/5 border border-white/5 px-3 py-2 text-xs text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>

          {/* In Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-blue-400" />
              <span className="text-xs font-medium text-slate-400">In Progress</span>
              <span className="ml-auto text-xs text-slate-500">2</span>
            </div>
            {['Homepage redesign copy', 'Instagram campaign assets'].map((item) => (
              <div
                key={item}
                className="rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2 text-xs text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>

          {/* Done */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-slate-400">Done</span>
              <span className="ml-auto text-xs text-slate-500">3</span>
            </div>
            {['Email newsletter draft', 'Client presentation', 'Blog post review'].map((item) => (
              <div
                key={item}
                className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2 text-xs text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pulsing dots */}
      <PulsingDot className="top-4 right-28" hint="Filter by date range" />
      <PulsingDot className="top-[7.5rem] left-6 sm:top-24 sm:left-8" hint="Click to view campaign details" />
      <PulsingDot className="bottom-16 right-10" hint="Drag to reorder tasks" />

      {/* Bullet points */}
      <ul className="mt-6 space-y-2">
        {[
          'Track campaign progress in real-time',
          'Manage team tasks across brands',
          'Monitor deliverables and deadlines',
        ].map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-slate-400">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ContentWorkspace() {
  const contentItems = [
    { platform: 'Instagram', color: 'bg-pink-500/20 text-pink-300', title: 'Product launch carousel' },
    { platform: 'LinkedIn', color: 'bg-blue-500/20 text-blue-300', title: 'Thought leadership article' },
    { platform: 'Blog', color: 'bg-emerald-500/20 text-emerald-300', title: 'SEO guide: Agency growth' },
    { platform: 'TikTok', color: 'bg-cyan-500/20 text-cyan-300', title: 'Behind the scenes reel' },
  ]

  return (
    <div className="relative">
      <div className="bg-[#111827] rounded-2xl border border-white/5 p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Left: Content list */}
          <div className="md:w-2/5 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white text-sm font-semibold">Content Queue</h4>
              <span className="text-xs text-slate-500">4 items</span>
            </div>
            {contentItems.map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/5 px-3 py-2.5 cursor-pointer hover:bg-white/10 transition-colors"
              >
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${item.color}`}>
                  {item.platform}
                </span>
                <span className="text-xs text-slate-300 truncate">{item.title}</span>
              </div>
            ))}
          </div>

          {/* Right: Editor area */}
          <div className="md:w-3/5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white text-sm font-semibold">Editor</h4>
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-[10px] text-slate-500">Last edited 2m ago</span>
              </div>
            </div>

            {/* Toolbar mockup */}
            <div className="flex items-center gap-1 rounded-lg bg-white/5 border border-white/5 px-3 py-2">
              {['B', 'I', 'U'].map((btn) => (
                <span
                  key={btn}
                  className="flex h-6 w-6 items-center justify-center rounded text-[10px] font-bold text-slate-400 hover:bg-white/10"
                >
                  {btn}
                </span>
              ))}
              <span className="mx-1 h-4 w-px bg-white/10" />
              {['H1', 'H2', 'Link', 'Img'].map((btn) => (
                <span
                  key={btn}
                  className="flex h-6 items-center justify-center rounded px-1.5 text-[10px] text-slate-400 hover:bg-white/10"
                >
                  {btn}
                </span>
              ))}
            </div>

            {/* Content placeholder */}
            <div className="space-y-3 rounded-lg bg-white/5 border border-white/5 p-4 min-h-[120px]">
              <div className="h-3 w-3/4 rounded-full bg-white/10" />
              <div className="h-3 w-full rounded-full bg-white/10" />
              <div className="h-3 w-5/6 rounded-full bg-white/10" />
              <div className="h-3 w-2/3 rounded-full bg-white/10" />
              <div className="h-3 w-4/5 rounded-full bg-white/10" />
            </div>
          </div>
        </div>
      </div>

      {/* Pulsing dots */}
      <PulsingDot className="top-14 left-4" hint="Click to select content item" />
      <PulsingDot className="top-24 right-8" hint="Format text with rich editor" />
      <PulsingDot className="bottom-20 right-24" hint="Add media and attachments" />

      {/* Bullet points */}
      <ul className="mt-6 space-y-2">
        {[
          'Draft content for any platform',
          'Rich text editor with media support',
          'Version history and collaboration',
        ].map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-slate-400">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

function AnalyticsPanel() {
  const metrics = [
    { label: 'Impressions', value: '245K', color: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' },
    { label: 'Engagement', value: '12.4%', color: 'bg-purple-500/10 border-purple-500/20 text-purple-300' },
    { label: 'Reach', value: '180K', color: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' },
    { label: 'Conversions', value: '2.8K', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' },
  ]

  const barData = [
    { label: 'Mon', height: 'h-16', color: 'from-indigo-500 to-indigo-600' },
    { label: 'Tue', height: 'h-24', color: 'from-indigo-500 to-purple-500' },
    { label: 'Wed', height: 'h-20', color: 'from-purple-500 to-purple-600' },
    { label: 'Thu', height: 'h-32', color: 'from-indigo-500 to-indigo-600' },
    { label: 'Fri', height: 'h-28', color: 'from-purple-500 to-indigo-500' },
    { label: 'Sat', height: 'h-14', color: 'from-indigo-500 to-purple-500' },
    { label: 'Sun', height: 'h-18', color: 'from-purple-500 to-purple-600' },
  ]

  return (
    <div className="relative">
      <div className="bg-[#111827] rounded-2xl border border-white/5 p-6 space-y-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className={`rounded-xl border p-4 space-y-1 ${metric.color}`}
            >
              <p className="text-xs opacity-80">{metric.label}</p>
              <p className="text-xl font-bold text-white">{metric.value}</p>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div className="rounded-xl bg-white/5 border border-white/5 p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-sm font-semibold text-white">Weekly Performance</h4>
            <div className="flex gap-2">
              {['7D', '30D', '90D'].map((period) => (
                <span
                  key={period}
                  className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${
                    period === '7D'
                      ? 'bg-indigo-500/20 text-indigo-300'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {period}
                </span>
              ))}
            </div>
          </div>

          {/* Bar chart */}
          <div className="flex items-end justify-between gap-3 h-36">
            {barData.map((bar) => (
              <div key={bar.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className={`w-full ${bar.height} rounded-t-md bg-gradient-to-t ${bar.color} opacity-80`}
                />
                <span className="text-[10px] text-slate-500">{bar.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pulsing dots */}
      <PulsingDot className="top-6 right-6" hint="Export report as PDF" />
      <PulsingDot className="top-48 left-8" hint="Drill down into daily metrics" />

      {/* Bullet points */}
      <ul className="mt-6 space-y-2">
        {[
          'Real-time campaign analytics',
          'Cross-platform performance tracking',
          'AI-powered optimization insights',
        ].map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-slate-400">
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ProductPreview() {
  const [activeTab, setActiveTab] = useState<TabId>('campaigns')

  return (
    <section id="product-preview" className="bg-[#0F172A] py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        {/* Tab bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 border-transparent'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Panel content */}
        <div className="mx-auto max-w-4xl">
          {activeTab === 'campaigns' && <CampaignDashboard />}
          {activeTab === 'content' && <ContentWorkspace />}
          {activeTab === 'analytics' && <AnalyticsPanel />}
        </div>
      </div>
    </section>
  )
}
