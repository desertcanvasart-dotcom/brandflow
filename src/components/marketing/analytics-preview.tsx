'use client'

import {
  BarChart, Bar, Cell,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const channelData = [
  { channel: 'Instagram', performance: 85, fill: '#E1306C' },
  { channel: 'LinkedIn', performance: 72, fill: '#0A66C2' },
  { channel: 'Facebook', performance: 65, fill: '#1877F2' },
  { channel: 'TikTok', performance: 58, fill: '#000000' },
  { channel: 'Blog', performance: 45, fill: '#F97316' },
]

const performanceData = [
  { month: 'Sep', impressions: 120, engagement: 45 },
  { month: 'Oct', impressions: 145, engagement: 52 },
  { month: 'Nov', impressions: 180, engagement: 61 },
  { month: 'Dec', impressions: 165, engagement: 58 },
  { month: 'Jan', impressions: 210, engagement: 72 },
  { month: 'Feb', impressions: 245, engagement: 85 },
]

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null
  return (
    <div className="rounded-lg bg-[#1E293B] border border-white/10 p-2 shadow-lg">
      <p className="text-xs font-medium text-slate-200">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs text-slate-400">
          <span style={{ color: entry.color }}>{entry.name}</span>: {entry.value}
        </p>
      ))}
    </div>
  )
}

export function AnalyticsPreview() {
  return (
    <section id="analytics" className="bg-[#0F172A] text-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Understand what drives results
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Real-time dashboards, automated reports, and AI-powered insights — so
            you can focus on strategy, not spreadsheets.
          </p>
        </div>

        <div className="mt-12 bg-[#111827] rounded-2xl border border-white/5 p-6 md:p-8">
          {/* Metric summary cards */}
          <div className="flex gap-4">
            <div className="bg-white/5 rounded-xl p-4 flex-1">
              <p className="text-xs text-slate-400">Campaign ROI</p>
              <p className="text-2xl font-bold text-emerald-400">340%</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 flex-1">
              <p className="text-xs text-slate-400">Avg. Engagement</p>
              <p className="text-2xl font-bold text-indigo-400">12.4%</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 flex-1">
              <p className="text-xs text-slate-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-purple-400">3.2%</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Chart 1: Channel Performance */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4">
                Channel Performance
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={channelData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="channel"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="performance" name="Performance" radius={[6, 6, 0, 0]}>
                    {channelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart 2: Content Performance Over Time */}
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-4">
                Content Performance Over Time
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<DarkTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="impressions"
                    name="Impressions"
                    stroke="#6366F1"
                    fill="#6366F1"
                    fillOpacity={0.15}
                  />
                  <Area
                    type="monotone"
                    dataKey="engagement"
                    name="Engagement"
                    stroke="#A855F7"
                    fill="#A855F7"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
